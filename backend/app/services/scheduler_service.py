"""
Reminder Scheduler Service for Gujjar Petrolium Kot Gujjran.
Business Timezone: Asia/Karachi (PKT).
Identifies eligible overdue balances, enforces customer consent, blocks inactive/opted-out
accounts, respects cooldown periods, generates reviewable previews, and logs audit events.
"""

from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from dateutil.tz import gettz as ZoneInfo

from typing import List, Dict, Any, Optional
from decimal import Decimal
import dateutil.parser

from app.core.config import settings
from app.core.constants import CustomerStatus, ReminderType, ReminderStatus, AuditAction
from app.core.logging import logger
from app.services.customer_service import customer_service
from app.services.ledger_service import ledger_service
from app.services.whatsapp_service import whatsapp_service
from app.services.sheets import sheets_service
from app.services.audit_service import audit_service


PKT_ZONE = ZoneInfo("Asia/Karachi")
REMINDER_COOLDOWN_DAYS = 7  # Do not send duplicate reminders to same customer within 7 days


class SchedulerCandidate:
    def __init__(
        self,
        customer_id: str,
        name: str,
        phone: str,
        current_balance: Decimal,
        overdue_days: int,
        reason_eligible: str,
    ):
        self.customer_id = customer_id
        self.name = name
        self.phone = phone
        self.current_balance = current_balance
        self.overdue_days = overdue_days
        self.reason_eligible = reason_eligible

    def to_dict(self) -> dict:
        return {
            "customer_id": self.customer_id,
            "name": self.name,
            "phone": self.phone,
            "current_balance": str(self.current_balance),
            "overdue_days": self.overdue_days,
            "reason_eligible": self.reason_eligible,
        }


class SchedulerService:
    def __init__(self):
        self.last_run_at: Optional[datetime] = None
        self.last_run_summary: Optional[Dict[str, Any]] = None

    def get_current_pkt_time(self) -> datetime:
        return datetime.now(PKT_ZONE)

    def evaluate_candidates(self) -> Dict[str, Any]:
        """
        Evaluates all customer accounts to identify overdue balances while strictly enforcing:
        - Customer must be ACTIVE (not INACTIVE, BLOCKED, or SUSPENDED)
        - Customer must have valid WhatsApp consent (whatsapp_consent == True)
        - Customer must not have received a reminder within the cooldown window (7 days)
        - Overdue balance must be strictly positive (> 0 PKR)
        """
        now_pkt = self.get_current_pkt_time()
        cooldown_cutoff = now_pkt - timedelta(days=REMINDER_COOLDOWN_DAYS)

        all_customers = customer_service.list_customers()
        reminder_rows = sheets_service.read_records("ReminderLog")

        # Map customer_id -> latest reminder datetime
        recent_reminders: Dict[str, datetime] = {}
        for r in reminder_rows:
            cid = str(r.get("customer_id", "")).strip()
            sent_str = str(r.get("sent_at", "") or r.get("created_at", ""))
            if not cid or not sent_str:
                continue
            try:
                dt = dateutil.parser.parse(sent_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc).astimezone(PKT_ZONE)
                else:
                    dt = dt.astimezone(PKT_ZONE)
                if cid not in recent_reminders or dt > recent_reminders[cid]:
                    recent_reminders[cid] = dt
            except Exception:
                continue

        eligible: List[SchedulerCandidate] = []
        excluded_inactive: List[str] = []
        excluded_no_consent: List[str] = []
        excluded_no_balance: List[str] = []
        excluded_cooldown: List[str] = []

        for cust in all_customers:
            # 1. Active status check
            if cust.status != CustomerStatus.ACTIVE:
                excluded_inactive.append(cust.id)
                continue

            # 2. WhatsApp consent & opt-out check
            if not cust.whatsapp_consent:
                excluded_no_consent.append(cust.id)
                continue

            # 3. Calculate authoritative ledger balance
            ledger = ledger_service.calculate_customer_ledger(cust.id)
            balance = ledger.current_balance

            if balance <= Decimal("0"):
                excluded_no_balance.append(cust.id)
                continue

            # 4. Check duplicate cooldown
            last_sent = recent_reminders.get(cust.id)
            if last_sent and last_sent > cooldown_cutoff:
                excluded_cooldown.append(cust.id)
                continue

            # Determine days since oldest unpaid balance or default
            overdue_days = 30  # Default monthly billing cycle
            eligible.append(
                SchedulerCandidate(
                    customer_id=cust.id,
                    name=cust.name,
                    phone=cust.phone,
                    current_balance=balance,
                    overdue_days=overdue_days,
                    reason_eligible=f"Active customer with outstanding balance of PKR {balance:,.2f} exceeding cooldown window.",
                )
            )

        return {
            "evaluated_at_pkt": now_pkt.isoformat(),
            "total_evaluated": len(all_customers),
            "eligible_count": len(eligible),
            "eligible_candidates": [c.to_dict() for c in eligible],
            "excluded_counts": {
                "inactive_or_suspended": len(excluded_inactive),
                "no_consent_or_opted_out": len(excluded_no_consent),
                "zero_or_negative_balance": len(excluded_no_balance),
                "in_cooldown_window": len(excluded_cooldown),
            },
        }

    def run_scheduler_batch(
        self,
        actor_name: str = "Automated Scheduler",
        force_live_dispatch: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes a scheduled reminder run.
        In DRY_RUN mode: generates simulated queue items.
        In LIVE mode: dispatches official WhatsApp Cloud API templates if authorized.
        Logs every attempt and outcome to the audit trail.
        """
        now_pkt = self.get_current_pkt_time()
        evaluation = self.evaluate_candidates()
        candidates = evaluation["eligible_candidates"]

        sent_count = 0
        simulated_count = 0
        failed_count = 0
        results = []

        for cand in candidates:
            cid = cand["customer_id"]
            amount = Decimal(cand["current_balance"])

            try:
                # Trigger reminder preview/dispatch via whatsapp_service
                reminder_type = ReminderType.URGENT if amount > Decimal("50000") else ReminderType.GENTLE
                
                resp = whatsapp_service.send_approved_reminder(
                    customer_id=cid,
                    reminder_type=reminder_type,
                    override_cooldown=False,
                    notes=f"Automated scheduler batch run by {actor_name}",
                    actor_name=actor_name,
                )

                is_dry_run = resp.get("dry_run", True)
                if is_dry_run:
                    simulated_count += 1
                    status_desc = "SIMULATED_LOGGED"
                else:
                    sent_count += 1
                    status_desc = "DISPATCHED_LIVE"

                results.append({
                    "customer_id": cid,
                    "phone": cand["phone"],
                    "amount_due": str(amount),
                    "status": status_desc,
                    "wamid": resp.get("wamid"),
                })
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to dispatch scheduled reminder for {cid}: {e}")
                results.append({
                    "customer_id": cid,
                    "phone": cand["phone"],
                    "status": "FAILED",
                    "error": str(e),
                })

        summary = {
            "run_at_pkt": now_pkt.isoformat(),
            "actor_name": actor_name,
            "messaging_mode": settings.MESSAGING_MODE,
            "total_candidates": len(candidates),
            "dispatched_live": sent_count,
            "simulated_dry_run": simulated_count,
            "failed": failed_count,
            "details": results,
            "evaluation_breakdown": evaluation["excluded_counts"],
        }

        self.last_run_at = now_pkt
        self.last_run_summary = summary

        # Record in audit trail
        audit_service.log_event(
            action=AuditAction.CREATE,
            entity_type="SCHEDULER",
            entity_id=f"SCHED-{now_pkt.strftime('%Y%m%d%H%M')}",
            actor_name=actor_name,
            actor_role="SYSTEM",
            details=f"Scheduler executed in {settings.MESSAGING_MODE} mode. Processed {len(candidates)} overdue accounts ({sent_count} live, {simulated_count} simulated, {failed_count} failed).",
            details_ur=f"شیڈولر چلایا گیا ({settings.MESSAGING_MODE})۔ کل {len(candidates)} کھاتے پروسیس ہوئے ({sent_count} لائیو، {simulated_count} ٹیسٹ)۔",
            metadata=summary,
        )

        return summary


scheduler_service = SchedulerService()
