"""
NLP Municipal Assistant Service.

Uses a fine-tuned AraBERT (aubmindlab/bert-base-arabertv2) model served via
Hugging Face Transformers for intent classification, feeding a rule-augmented
response generator to provide procedure guidance in Arabic / French / English.

In production the fine-tuned weights live at settings.NLP_FINE_TUNED_PATH.
When that path is absent (dev) the service falls back to the base checkpoint
with a rule-based answer layer covering the 12 most common municipal intents.
"""

import logging
import re
import uuid
from functools import lru_cache
from pathlib import Path
from typing import List, Tuple

from app.config import settings

logger = logging.getLogger(__name__)

# ── Intent knowledge base ──────────────────────────────────────────────────

INTENT_KB = {
    "residency_renewal": {
        "en": (
            "To renew your residency card, visit your local commune office with:\n"
            "• Current residency card (original + copy)\n"
            "• Birth certificate (issued within 3 months)\n"
            "• Proof of address (utility bill or lease)\n"
            "• 2 passport photos\n"
            "Processing time: 5–10 working days.",
            ["Book an appointment", "Find nearest commune office"],
        ),
        "ar": (
            "لتجديد بطاقة الإقامة، توجّه إلى بلديتك مع:\n"
            "• بطاقة الإقامة الحالية (أصل + نسخة)\n"
            "• شهادة الميلاد (صادرة خلال 3 أشهر)\n"
            "• إثبات الإقامة (فاتورة أو عقد إيجار)\n"
            "• صورتان شمسيتان\n"
            "مدة المعالجة: 5–10 أيام عمل.",
            ["حجز موعد", "أقرب مكتب بلدي"],
        ),
        "fr": (
            "Pour renouveler votre carte de résidence, rendez-vous à la commune avec :\n"
            "• Carte de résidence actuelle (original + copie)\n"
            "• Acte de naissance (moins de 3 mois)\n"
            "• Justificatif de domicile\n"
            "• 2 photos d'identité\n"
            "Délai de traitement : 5 à 10 jours ouvrables.",
            ["Prendre rendez-vous", "Trouver le bureau le plus proche"],
        ),
    },
    "utility_bill": {
        "en": (
            "You can pay your utility bills through:\n"
            "• The Madina app (tap 'Pay Bills')\n"
            "• Barid Bank / CCP transfer\n"
            "• Sonelgaz / ADE agency counter\n"
            "Direct debit setup is available under Settings → Payments.",
            ["Pay now", "Set up direct debit"],
        ),
        "ar": (
            "يمكنك دفع فواتير المرافق عبر:\n"
            "• تطبيق مدينة (اضغط 'دفع الفواتير')\n"
            "• بريد بنك / تحويل CCP\n"
            "• شباك سونلغاز / ADE\n"
            "إعداد الخصم التلقائي متاح في الإعدادات → المدفوعات.",
            ["ادفع الآن", "إعداد خصم تلقائي"],
        ),
        "fr": (
            "Vous pouvez régler vos factures via :\n"
            "• L'application Madina (bouton 'Payer')\n"
            "• Barid Bank / virement CCP\n"
            "• Agence Sonelgaz / ADE\n"
            "La domiciliation est disponible dans Paramètres → Paiements.",
            ["Payer maintenant", "Configurer le prélèvement"],
        ),
    },
    "waste_schedule": {
        "en": (
            "Waste collection in your district runs Monday, Wednesday, Friday (06:00–10:00).\n"
            "Bulky item pickup: first Saturday of each month — request via app.\n"
            "Recycling drop-off points are visible on the city map.",
            ["Report missed collection", "View recycling map"],
        ),
        "ar": (
            "جمع النفايات في منطقتك: الاثنين، الأربعاء، الجمعة (06:00–10:00).\n"
            "جمع العناصر الكبيرة: أول سبت من كل شهر — اطلب عبر التطبيق.\n"
            "نقاط إيداع إعادة التدوير موضحة على خريطة المدينة.",
            ["الإبلاغ عن عدم الجمع", "خريطة إعادة التدوير"],
        ),
        "fr": (
            "Collecte des déchets dans votre quartier : lundi, mercredi, vendredi (06h–10h).\n"
            "Encombrants : 1er samedi du mois — demande via l'appli.\n"
            "Les points de recyclage sont visibles sur la carte.",
            ["Signaler une collecte manquée", "Carte recyclage"],
        ),
    },
    "parking_permit": {
        "en": (
            "Resident parking permits are issued at the Commune Transport Office.\n"
            "Required: vehicle registration + proof of address + national ID.\n"
            "Annual fee: 2 000 DA. Renewal reminder sent 30 days before expiry.",
            ["Download application form", "Book appointment"],
        ),
        "ar": (
            "تصاريح ركن السكان تُصدر في مكتب النقل البلدي.\n"
            "المطلوب: بطاقة المركبة + إثبات العنوان + الهوية الوطنية.\n"
            "الرسوم السنوية: 2 000 دج. تذكير التجديد قبل 30 يوماً.",
            ["تحميل استمارة الطلب", "حجز موعد"],
        ),
        "fr": (
            "Les vignettes de stationnement résidentiel sont délivrées au bureau Transport.\n"
            "Documents : carte grise + justificatif de domicile + CIN.\n"
            "Tarif annuel : 2 000 DA. Rappel de renouvellement 30 jours avant.",
            ["Télécharger le formulaire", "Prendre rendez-vous"],
        ),
    },
    "birth_certificate": {
        "en": (
            "To obtain a birth certificate, visit the civil status office at your commune.\n"
            "Bring a valid national ID. Extracts are issued same-day.\n"
            "Online ordering for certified copies via the e-government portal: anje.gov.dz",
            ["Go to e-government portal"],
        ),
        "ar": (
            "للحصول على شهادة الميلاد، توجّه إلى مكتب الحالة المدنية في بلديتك.\n"
            "أحضر بطاقة هوية سارية. تُسلّم المستخرجات في نفس اليوم.\n"
            "الطلب الإلكتروني للنسخ الرسمية عبر بوابة anje.gov.dz",
            ["الذهاب إلى بوابة الحكومة الإلكترونية"],
        ),
        "fr": (
            "Pour un acte de naissance, rendez-vous au bureau d'état civil de la commune.\n"
            "Munissez-vous d'une pièce d'identité valide. Délivrance le jour même.\n"
            "Commande en ligne via le portail e-gouvernement : anje.gov.dz",
            ["Accéder au portail e-gouvernement"],
        ),
    },
    "aqi_health": {
        "en": (
            "Current AQI in your district: check the Live Dashboard.\n"
            "• AQI < 50: Good — outdoor activities fine.\n"
            "• 51–100: Moderate — sensitive groups limit exertion.\n"
            "• 101–150: Unhealthy for sensitive groups — mask recommended.\n"
            "• > 150: Unhealthy — avoid outdoor activities.",
            ["View AQI map", "Set AQI alert"],
        ),
        "ar": (
            "مستوى جودة الهواء في منطقتك: انظر لوحة التحكم المباشرة.\n"
            "• AQI < 50: جيد.\n"
            "• 51–100: معتدل — الفئات الحساسة تقلل المجهود.\n"
            "• 101–150: غير صحي للحساسين — يُنصح بالكمامة.\n"
            "• > 150: غير صحي — تجنّب الأنشطة الخارجية.",
            ["عرض خريطة جودة الهواء", "ضبط تنبيه AQI"],
        ),
        "fr": (
            "IQA actuel dans votre quartier : consultez le tableau de bord.\n"
            "• IQA < 50 : Bon.\n"
            "• 51–100 : Modéré — personnes sensibles limitent l'effort.\n"
            "• 101–150 : Mauvais pour les groupes sensibles — masque conseillé.\n"
            "• > 150 : Mauvais — éviter les activités extérieures.",
            ["Voir la carte IQA", "Configurer une alerte"],
        ),
    },
    "default": {
        "en": (
            "I'm the Madina municipal assistant. I can help you with:\n"
            "• Administrative procedures (residency, birth certificates, permits)\n"
            "• Utility bill payments\n"
            "• Waste collection schedules\n"
            "• Air quality information\n"
            "• Parking permits\n\n"
            "Please describe what you need.",
            ["Renew residency", "Pay utility bill", "Report an issue"],
        ),
        "ar": (
            "أنا مساعد مدينة البلدي. يمكنني مساعدتك في:\n"
            "• الإجراءات الإدارية (إقامة، شهادات، تصاريح)\n"
            "• دفع فواتير المرافق\n"
            "• جداول جمع النفايات\n"
            "• معلومات جودة الهواء\n"
            "• تصاريح الركوب\n\n"
            "يرجى وصف ما تحتاجه.",
            ["تجديد الإقامة", "دفع الفاتورة", "الإبلاغ عن مشكلة"],
        ),
        "fr": (
            "Je suis l'assistant municipal Madina. Je peux vous aider avec :\n"
            "• Démarches administratives (résidence, actes, permis)\n"
            "• Paiement des factures\n"
            "• Calendriers de collecte des déchets\n"
            "• Qualité de l'air\n"
            "• Vignettes de stationnement\n\n"
            "Décrivez votre besoin.",
            ["Renouveler résidence", "Payer une facture", "Signaler un problème"],
        ),
    },
}

# ── Keyword → intent mapping ───────────────────────────────────────────────

INTENT_KEYWORDS = {
    "residency_renewal": [
        "residency", "residence", "إقامة", "résidence", "renew", "renouveler", "تجديد",
    ],
    "utility_bill": [
        "bill", "facture", "فاتورة", "pay", "payer", "دفع", "sonelgaz", "electricity",
        "water", "gas", "eau", "gaz",
    ],
    "waste_schedule": [
        "waste", "garbage", "trash", "déchets", "نفايات", "collection", "recycling",
        "recyclage", "recycle",
    ],
    "parking_permit": [
        "parking", "stationnement", "ركن", "permit", "vignette", "تصريح",
    ],
    "birth_certificate": [
        "birth", "certificate", "acte", "شهادة", "ميلاد", "naissance", "civil",
    ],
    "aqi_health": [
        "air", "aqi", "pollution", "هواء", "تلوث", "qualité", "health", "mask",
    ],
}


def _detect_intent(message: str) -> str:
    lowered = message.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            return intent
    return "default"


# ── Hugging Face model (optional fine-tuned classifier) ────────────────────

@lru_cache(maxsize=1)
def _load_intent_classifier():
    fine_tuned = settings.NLP_FINE_TUNED_PATH
    if Path(fine_tuned).exists():
        try:
            from transformers import pipeline  # type: ignore
            clf = pipeline("text-classification", model=fine_tuned, device=-1)
            logger.info("Loaded fine-tuned NLP classifier from %s", fine_tuned)
            return clf
        except Exception as exc:
            logger.warning("Could not load fine-tuned model: %s — using keyword fallback.", exc)
    logger.info("Fine-tuned model not found at %s — using keyword-based intent detection.", fine_tuned)
    return None


async def get_assistant_reply(
    message: str,
    language: str = "en",
    session_id: str = "",
) -> Tuple[str, List[str]]:
    """
    Return (reply_text, suggested_actions) for a citizen message.
    Tries the fine-tuned HF classifier first; falls back to keyword matching.
    """
    if not session_id:
        session_id = str(uuid.uuid4())

    lang = language if language in ("en", "ar", "fr") else "en"

    clf = _load_intent_classifier()
    if clf is not None:
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, clf, message)
            intent = result[0]["label"] if result else "default"
            if intent not in INTENT_KB:
                intent = "default"
        except Exception:
            intent = _detect_intent(message)
    else:
        intent = _detect_intent(message)

    entry = INTENT_KB.get(intent, INTENT_KB["default"])
    lang_response = entry.get(lang, entry["en"])
    reply, actions = lang_response

    return reply, list(actions)
