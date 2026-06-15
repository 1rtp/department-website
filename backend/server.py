from fastapi import FastAPI, APIRouter, HTTPException, Query, File, UploadFile
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from fastapi.responses import Response, StreamingResponse
from datetime import datetime
from passlib.context import CryptContext
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from bson import ObjectId
from bson.errors import InvalidId
import os, logging, math, uuid, secrets, asyncio, base64, uvicorn
from urllib.parse import quote

def localize(doc: dict, lang: str) -> dict:
    if doc is None:
        return doc
    result = {}
    for key, value in doc.items():
        if isinstance(value, dict) and set(value.keys()) <= {"ua", "en"}:
            result[key] = value.get(lang) or value.get("ua") or ""
        elif isinstance(value, list):
            result[key] = [
                (item.get(lang) or item.get("ua") or "")
                if isinstance(item, dict) and set(item.keys()) <= {"ua", "en"}
                else (localize(item, lang) if isinstance(item, dict) else item)
                for item in value
            ]
        elif isinstance(value, dict):
            result[key] = localize(value, lang)
        else:
            result[key] = value
    return result

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

fs = AsyncIOMotorGridFSBucket(db, bucket_name="staff_files")

app = FastAPI()
api_router = APIRouter(prefix="/api")

@app.middleware("http")
async def set_body_size(request: Request, call_next):
    return await call_next(request)

app.state.max_upload_size = 100 * 1024 * 1024

# ══════════════ MODELS ══════════════

class StaffMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_en: Optional[str] = None
    position: str
    degree: str
    category: str
    specialization: str
    photo_url: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    education: List[dict] = []
    career: List[dict] = []
    teaching_experience: str = ""
    disciplines: List[str] = []
    specialties_taught: List[str] = []
    publications: List[dict] = []
    certificates: List[dict] = []
    social_links: dict = {}

class NewsItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str
    date: str
    image_url: Optional[str] = None
    content_image: Optional[str] = None
    gallery_images: List[str] = []
    reading_time: int = 5
    tags: List[str] = []

class ExamEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    exam_date: str
    exam_time: str = "09:00"
    consultation_date: str
    consultation_time: str = "14:00"
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None

class GroupExamSchedule(BaseModel):
    group_id: str
    exams: List[ExamEntry] = []

class Specialty(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    code: str = "122"
    degree_level: str
    duration: str
    student_count: int
    description: str
    competencies: List[str] = []
    learning_outcomes: List[str] = []
    additional_text: str = ""
    program_pdf_url: str = ""
    image_url: str = ""

class FAQItem(BaseModel):
    question: str
    answer: str


class Feature(BaseModel):
    icon: str
    title: str
    subtitle: str
    text: str

class ContactInfo(BaseModel):
    phone: str
    email: str
    location: str
    hours: str
    address: str

class DepartmentInfo(BaseModel):
    about_title: str
    about_text1: str
    about_text2: str
    history_text: str
    contacts: ContactInfo
    faq_items: List[FAQItem]
    features: List[Feature]

class LabProject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lab_id: str
    name: str
    description: str
    image_url: Optional[str] = None
    coordinator_ids: List[str] = []
    coordinator_names: List[str] = []

class PaginatedStaff(BaseModel):
    items: List[StaffMember]
    total: int
    page: int
    limit: int
    pages: int

class PaginatedNews(BaseModel):
    items: List[NewsItem]
    total: int
    page: int
    limit: int
    pages: int

class PaginatedProjects(BaseModel):
    items: List[LabProject]
    total: int
    page: int
    limit: int
    pages: int

class StudyGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    course: int
    semester: Optional[int] = None
    speciality_code: Optional[str] = "122"
    curator_staff_id: Optional[str] = None
    curator_name: Optional[str] = None

class UserInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    name: str
    email: str
    is_approved: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    hashed_password: Optional[str] = None
    course: Optional[int] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    staff_id: Optional[str] = None

class RegisterRequest(BaseModel):
    role: str
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: str
    course: Optional[Any] = None
    group_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class RegistrationResult(BaseModel):
    message: str
    user_id: str

class Announcement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    text: str
    date: str
    target_groups: List[str] = []

class ConsultationSlot(BaseModel):
    time: str
    subject: str
    room: Optional[str] = None
    teacher: Optional[str] = None

class GroupSchedule(BaseModel):
    group_id: str
    monday: List[dict] = []
    tuesday: List[dict] = []
    wednesday: List[dict] = []
    thursday: List[dict] = []
    friday: List[dict] = []

class UpdateContactsRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class NotificationMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    text: str
    recipient: str
    sent_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    sent_by: Optional[str] = None
 
class ElectiveSelection(BaseModel):
    user_id: str
    course: int
    selected_disciplines: List[str] = []
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
 
class SendNotificationRequest(BaseModel):
    recipient: str
    title: str
    text: str
 
class UpdateSelectionRequest(BaseModel):
    selected_disciplines: List[str]

# ══════════════ ЯК ОТРИМАТИ ТОКЕН ══════════════
# 1. POST /api/auth/login  з body: {"email": "...", "password": "..."}
# 2. У відповіді буде {"token": "abc123...", "user": {...}}
# 3. Скопіюйте значення token і вставляйте у поле ?token= усіх захищених ендпоїнтів
#
# Адмін-акаунт (після /api/seed):  admin@gmail.com
# Студент (після /api/seed):        student@gmail.com
# ═══════════════════════════════════════════════

# ══════════════ STAFF ══════════════

@api_router.get("/staff",
    summary="Список викладачів", 
    description=(
        "Повертає посторінковий список співробітників кафедри.\n\n"
        "**category** — фільтр за категорією: `professor`, `associate_professor`, "
        "`senior_lecturer`, `lecturer`, `engineering`, або пропустіть для показу всіх.\n\n"
        "**page** — номер сторінки (починаючи з 1).\n\n"
        "**limit** — кількість записів на сторінці (1–50, за замовчуванням 9)."
    ),
)
async def get_staff(
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=50),
    lang: str = Query("ua")
):
    query = {}
    if category and category != "all":
        query["category"] = category
    total = await db.staff.count_documents(query)
    skip = (page - 1) * limit
    items = await db.staff.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    items = [localize(i, lang) for i in items]
    pages = max(1, math.ceil(total / limit))
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


@api_router.get("/staff/{staff_id}",
    summary="Профіль викладача",
    description=(
        "**staff_id** — рядковий UUID викладача (поле `id` з колекції `staff` у MongoDB, "
        "НЕ `_id` ObjectId). Приклад: `3f2a1b4c-...`.\n\n"
        "Отримати список `id` можна через `GET /api/staff`."
    ),
)
async def get_staff_member(staff_id: str, lang: str = Query("ua")):
    doc = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Staff member not found")
    linked_user = await db.users.find_one({"staff_id": staff_id, "is_approved": True}, {"_id": 0, "hashed_password": 0})
    if not linked_user:
        doc = {**doc, "email": None}
    return localize(doc, lang)

@api_router.get("/staff/{staff_id}/projects",
    summary="Проєкти викладача",
    description=(
        "**staff_id** — UUID викладача (поле `id` з колекції `staff`).\n\n"
        "Повертає всі лабораторні проєкти, де цей викладач є координатором."
    ),
)
async def get_staff_projects(staff_id: str, lang: str = Query("ua")):
    cursor = db.lab_projects.find({"coordinator_ids": staff_id}, {"_id": 0})
    projects = await cursor.to_list(length=100)
    return [localize(p, lang) for p in projects]

# ══════════════ NEWS ══════════════

@api_router.get("/news",
    summary="Список новин",
    description=(
        "**category** — фільтр за категорією новини (наприклад `events`, `science`, `education`). "
        "Пропустіть або передайте `all` для всіх.\n\n"
        "**page**, **limit** — пагінація (limit до 50)."
    ),
)
async def get_news(
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=50),
    lang: str = Query("ua")
):
    query = {}
    if category and category != "all":
        query["category"] = category
    total = await db.news.count_documents(query)
    skip = (page - 1) * limit
    items = await db.news.find(query, {"_id": 0}).skip(skip).limit(limit).sort("date", -1).to_list(limit)
    items = [localize(i, lang) for i in items]
    pages = max(1, math.ceil(total / limit))
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


@api_router.get("/news/{news_id}",
    summary="Одна новина",
    description="**news_id** — UUID новини (поле `id` з колекції `news`). Отримати можна через `GET /api/news`.",
)
async def get_news_item(news_id: str, lang: str = Query("ua")):
    doc = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="News item not found")
    return localize(doc, lang)


@api_router.get("/news/{news_id}/related",
    summary="Схожі новини",
    description="**news_id** — UUID новини. Повертає до 6 новин тієї ж категорії.",
)
async def get_related_news(news_id: str, lang: str = Query("ua")):
    item = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="News item not found")
    related = await db.news.find({"id": {"$ne": news_id}, "category": item["category"]}, {"_id": 0}).limit(6).to_list(6)
    if len(related) < 6:
        existing_ids = [news_id] + [r["id"] for r in related]
        extra = await db.news.find({"id": {"$nin": existing_ids}}, {"_id": 0}).limit(6 - len(related)).to_list(6)
        related.extend(extra)
    return [localize(r, lang) for r in related]


# ══════════════ SPECIALTIES ══════════════

@api_router.get("/specialties", 
    summary="Список спеціальностей",
    description="Повертає всі спеціальності кафедри. Публічний ендпоїнт, токен не потрібен.",
)
async def get_specialties(lang: str = Query("ua")):
    docs = await db.specialties.find({}, {"_id": 0}).to_list(10)
    return [localize(d, lang) for d in docs]


@api_router.get("/specialties/{specialty_id}", 
    summary="Деталі спеціальності",
    description="**specialty_id** — UUID спеціальності (поле `id` з колекції `specialties`).",
)
async def get_specialty(specialty_id: str, lang: str = Query("ua")):
    doc = await db.specialties.find_one({"id": specialty_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Specialty not found")
    return localize(doc, lang)

@api_router.get("/specialties/{specialty_id}/pdf", 
    summary="PDF навчальної програми",
    description="**specialty_id** — UUID спеціальності. Повертає PDF-файл програми у відповідь (inline).",
)
async def get_specialty_pdf(specialty_id: str):
    doc = await db.specialties.find_one({"id": specialty_id}, {"_id": 0, "program_pdf_url": 1, "title": 1})
    if not doc or not doc.get("program_pdf_url"):
        raise HTTPException(status_code=404, detail="PDF не знайдено")
        
    pdf_data = doc["program_pdf_url"]
    if "," in pdf_data:
        pdf_data = pdf_data.split(",")[1]
    try:
        pdf_bytes = base64.b64decode(pdf_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Немає файлу")
    title_obj = doc.get("title")
    if isinstance(title_obj, dict):
        filename_text = title_obj.get("ua") or title_obj.get("en") or "program"
    else:
        filename_text = str(title_obj or "program")
    filename = f"{filename_text.replace(' ', '_')}.pdf"
    safe_filename = "program.pdf" 
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{safe_filename}"'
        }
    )

# ══════════════ DEPARTMENT INFO ══════════════

@api_router.get("/department-info", 
    summary="Інформація про кафедру",
    description="Повертає загальну інформацію про кафедру (контакти, FAQ, опис). Публічний ендпоїнт.",
)
async def get_department_info(lang: str = Query("ua")):
    doc = await db.department_info.find_one({}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Department info not found")
    return localize(doc, lang)

@api_router.put("/department-info", 
    summary="Оновити інфо про кафедру (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — сесійний токен. Отримати: `POST /api/auth/login` → поле `token` у відповіді. "
        "Body — довільний JSON-об'єкт з полями які треба оновити (patch-стиль через `$set`)."
    ),
)
async def update_department_info(data: dict, token: str = Query(...)):
    await require_admin(token)
    await db.department_info.update_one({}, {"$set": data}, upsert=True)
    doc = await db.department_info.find_one({}, {"_id": 0})
    return doc

# ══════════════ LABORATORIES ══════════════

@api_router.get("/laboratories", 
    summary="Список лабораторій",
    description="Повертає всі лабораторії кафедри. Публічний ендпоїнт, токен не потрібен.",
)
async def get_laboratories(lang: str = Query("ua")):
    docs = await db.laboratories.find({}, {"_id": 0}).to_list(20)
    return [localize(d, lang) for d in docs]


@api_router.get("/laboratories/{lab_id}", 
    summary="Деталі лабораторії",
    description="**lab_id** — UUID лабораторії (поле `id` з колекції `laboratories`).",
)
async def get_laboratory(lab_id: str, lang: str = Query("ua")):
    lab = await db.laboratories.find_one({"id": lab_id}, {"_id": 0})
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratory not found")
    if lab.get("head_staff_id"):
        head = await db.staff.find_one({"id": lab["head_staff_id"]}, {"_id": 0})
        lab["head"] = localize(head, lang)
    if lab.get("team_member_ids"):
        team = await db.staff.find({"id": {"$in": lab["team_member_ids"]}}, {"_id": 0}).to_list(20)
        lab["team_members"] = [localize(m, lang) for m in team]
    return localize(lab, lang)


@api_router.get("/laboratories/{lab_id}/projects",
    summary="Проєкти лабораторії",
    description=(
        "**lab_id** — UUID лабораторії.\n\n"
        "**page**, **limit** — пагінація (limit до 50, за замовч. 8)."
    ),
)
async def get_lab_projects(
    lab_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=50),
    lang: str = Query("ua")
):
    query = {"lab_id": lab_id}
    total = await db.lab_projects.count_documents(query)
    skip = (page - 1) * limit
    items = await db.lab_projects.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    items = [localize(i, lang) for i in items]
    pages = max(1, math.ceil(total / limit))
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


@api_router.get("/lab-projects/{project_id}", 
    summary="Деталі проєкту",
    description="**project_id** — UUID проєкту (поле `id` з колекції `lab_projects`).",
)
async def get_lab_project(project_id: str, lang: str = Query("ua")):
    doc = await db.lab_projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Lab project not found")
    if doc.get("coordinator_ids"):
        coordinators = await db.staff.find({"id": {"$in": doc["coordinator_ids"]}}, {"_id": 0}).to_list(10)
        doc["coordinators"] = [localize(c, lang) for c in coordinators]
    return localize(doc, lang)

# --- Groups ---
@api_router.get("/groups",
    summary="Список груп",
    description="**course** — фільтр за курсом (1, 2, 3 або 4). Пропустіть для всіх груп.",
)
async def get_groups(course: Optional[int] = Query(None)):
    query = {}
    if course is not None:
        query["course"] = course
    docs = await db.study_groups.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return [localize(d, "ua") for d in docs]

# --- Auth: Register ---
@api_router.post("/auth/register", response_model=RegistrationResult, 
    summary="Реєстрація нового користувача",
    description=(
        "Подає заявку на реєстрацію. Акаунт буде **неактивний** до підтвердження адміном.\n\n"
        "**role** — `student` або `staff`.\n\n"
        "**name** (або **full_name**) — повне ПІБ. Для `staff` має точно збігатися з ім'ям у колекції `staff`.\n\n"
        "**email** — унікальна пошта, буде використовуватись для входу.\n\n"
        "**course** — курс (1–4), тільки для студентів.\n\n"
        "**group_id** — UUID групи (поле `id` з колекції `study_groups`), тільки для студентів. "
        "Отримати: `GET /api/groups`."
    ),
)
async def register(req: RegisterRequest):
    if req.role not in ("student", "staff"):
        raise HTTPException(status_code=400, detail="Невірна роль")
    display_name = (req.name or req.full_name or "").strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="Не вказано ПІБ")
    existing = await db.users.find_one({"email": req.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=409, detail="Користувач з таким email вже існує")
    group_name = None
    staff_id = None
    if req.role == "student":
        if not req.course or not req.group_id:
            raise HTTPException(status_code=400, detail="Для студента необхідно вказати курс та групу")
        group = await db.study_groups.find_one({"id": req.group_id}, {"_id": 0})
        if not group:
            raise HTTPException(status_code=404, detail="Групу не знайдено")
        group_name = group["name"]
    elif req.role == "staff":
        staff_doc = await db.staff.find_one(
            {"$or": [
                {"name": {"$regex": display_name.strip(), "$options": "i"}},
                {"name_en": {"$regex": display_name.strip(), "$options": "i"}},
            ]},
            {"_id": 0}
        )
        if not staff_doc:
            raise HTTPException(
                status_code=404,
                detail="Співробітника з таким ПІБ не знайдено в базі кафедри. Зверніться до адміністратора."
            )
        already_linked = await db.users.find_one({"staff_id": staff_doc["id"]})
        if already_linked:
            raise HTTPException(status_code=409, detail="Акаунт для цього співробітника вже існує")
        staff_id = staff_doc["id"]
    user = UserInDB(
        role=req.role, name=display_name, email=req.email.lower().strip(),
        course=req.course if req.role == "student" else None,
        group_id=req.group_id if req.role == "student" else None,
        group_name=group_name,
        staff_id=staff_id,
    )
    await db.users.insert_one(user.dict())
    return RegistrationResult(message="Заявку подано", user_id=user.id)

# --- Auth: Login ---
@api_router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Вхід в систему",
    description=(
        "Повертає **token** — зберігайте його та передавайте у всі захищені ендпоїнти.\n\n"
        "Токен не має терміну дії, видаляється лише при `/auth/logout`."
    ),
)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower().strip()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Невірний email або пароль")
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Акаунт не підтверджено адміністратором")
    if not user.get("hashed_password") or not pwd_context.verify(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Невірний email або пароль")
    token = secrets.token_hex(32)
    await db.sessions.insert_one({"token": token, "user_id": user["id"], "created_at": datetime.utcnow().isoformat()})

    # Return full user object (without password hash)
    user_data = {k: v for k, v in user.items() if k != "hashed_password"}
    return LoginResponse(token=token, user=user_data)


# --- Auth: Get current user (refresh profile) ---
@api_router.get("/auth/me", 
    summary="Поточний користувач",
    description=(
        "**token** — сесійний токен з відповіді `/auth/login`.\n\n"
        "Повертає профіль залогіненого користувача без пароля."
    ),
)
async def get_current_user(token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")
    return user


# --- Auth: Logout ---
@api_router.post("/auth/logout", 
    summary="Вихід",
    description="**token** — токен сесії. Видаляє сесію з БД.",
)
async def logout(token: str = Query(...)):
    await db.sessions.delete_one({"token": token})
    return {"message": "Вихід виконано"}

# ══════════════ ADMIN HELPER ══════════════
 
async def require_admin(token: str):
    """Допоміжна функція перевірки токена адміна"""
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user or user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    return user
 
 
# ══════════════ REGISTRATION APPROVAL ══════════════
 
@api_router.get("/admin/pending-users", 
    summary="Непідтверджені користувачі (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна. Як отримати: зайдіть через `POST /api/auth/login` "
        "з credentials адміна → скопіюйте поле `token`.\n\n"
        "Повертає список заявок на реєстрацію які ще не підтверджено."
    ),
)
async def admin_get_pending(token: str = Query(...)):
    await require_admin(token)
    users = await db.users.find({"is_approved": False}, {"_id": 0, "hashed_password": 0}).to_list(200)
    for u in users:
        if u.get("created_at"):
            try:
                dt = datetime.fromisoformat(u["created_at"])
                u["date"] = dt.strftime("%d.%m.%Y")
            except:
                u["date"] = u["created_at"]
    return users
 
 
@api_router.post("/admin/approve-user/{user_id}", 
    summary="Підтвердити реєстрацію (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**user_id** — UUID користувача (поле `id` з колекції `users`). "
        "Отримати зі списку `GET /admin/pending-users`.\n\n"
        "**token** — токен адміна.\n\n"
        "Генерує тимчасовий пароль і надсилає його на email користувача."
    ),
)
async def admin_approve_user(user_id: str, token: str = Query(...)):
    await require_admin(token)
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    if user.get("is_approved"):
        raise HTTPException(status_code=400, detail="Вже підтверджено")
        
    temp_password = secrets.token_urlsafe(10)
    hashed = pwd_context.hash(temp_password)
    await db.users.update_one({"id": user_id}, {"$set": {"is_approved": True, "hashed_password": hashed}})

    if user.get("role") == "staff" and user.get("staff_id"):
        await db.staff.update_one(
            {"id": user["staff_id"]},
            {"$set": {"email": user["email"]}}
        )

    def send_email_sync():
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            SMTP_FROM = "rasericin@gmail.com"
            SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

            if SMTP_PASSWORD:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = "Ваш акаунт підтверджено — Кафедра КН та ІТ"
                msg["From"] = SMTP_FROM
                msg["To"] = user["email"]

                html = f"""
                <html><body>
                <h2>Вітаємо, {user['name']}!</h2>
                <p>Ваш акаунт у системі кафедри КН та ІТ підтверджено адміністратором.</p>
                <p><strong>Ваші дані для входу:</strong></p>
                <ul>
                    <li>Email: <strong>{user['email']}</strong></li>
                    <li>Тимчасовий пароль: <strong>{temp_password}</strong></li>
                </ul>
                <p>Після входу рекомендуємо змінити пароль у налаштуваннях акаунта.</p>
                <p><a href="http://localhost:3000/login">Перейти до входу</a></p>
                </body></html>
                """
                msg.attach(MIMEText(html, "html"))

                with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                    server.login(SMTP_FROM, SMTP_PASSWORD)
                    server.sendmail(SMTP_FROM, user["email"], msg.as_string())
        except Exception as e:
            logger.warning(f"Email not sent: {e}")

    asyncio.create_task(asyncio.to_thread(send_email_sync))

    if user.get("role") == "student" and user.get("group_id"):
        grp = await db.study_groups.find_one({"id": user["group_id"]}, {"_id": 0})
        if grp:
            update_fields = {}
            if grp.get("curator_staff_id"):
                update_fields["curator_staff_id"] = grp["curator_staff_id"]
                update_fields["curator_name"] = grp.get("curator_name")
            if grp.get("semester") is not None:
                update_fields["semester"] = grp["semester"]
            if update_fields:
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": update_fields}
                )

    logger.info(f"Approved user {user['email']} — temp_password: {temp_password}")
    return {"message": "Підтверджено", "email": user["email"], "temp_password": temp_password}
 
 
@api_router.post("/admin/reject-user/{user_id}", 
    summary="Відхилити реєстрацію (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**user_id** — UUID зі списку `GET /admin/pending-users`.\n\n"
        "**token** — токен адміна. Видаляє заявку назавжди."
    ),
)
async def admin_reject_user(user_id: str, token: str = Query(...)):
    await require_admin(token)
    result = await db.users.delete_one({"id": user_id, "is_approved": False})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Заявку не знайдено або вже підтверджено")
    return {"message": "Відхилено і видалено"}
 
# ══════════════ NOTIFICATIONS ══════════════
 
@api_router.post("/admin/notifications", 
    summary="Надіслати сповіщення (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна.\n\n"
        "Body (JSON): `title` (рядок), `text` (рядок), "
        "`recipient` — `all` / `students` / `staff`, "
        "`is_important` (bool, за замовч. false)."
    ),
)
async def admin_send_notification(data: dict, token: str = Query(...)):
    admin = await require_admin(token)
    msg = {
        "id": str(uuid.uuid4()),
        "title": data.get("title", ""),
        "text": data.get("text", ""),
        "recipient": data.get("recipient", "all"),
        "sent_at": datetime.utcnow().isoformat(),
        "sent_by": admin["name"],
        "is_important": data.get("is_important", False),
        "from_admin": True,
    }
    await db.notifications.insert_one({**msg})

    announcement = {
        "id": msg["id"],
        "title": msg["title"],
        "text": msg["text"],
        "date": datetime.utcnow().strftime("%d.%m.%Y"),
        "target_role": msg["recipient"],
        "is_important": msg.get("is_important", False),
        "from_admin": True,
        "target_groups": [],
    }
    await db.announcements.insert_one(announcement)
    return msg
 
 
@api_router.get("/admin/notifications", 
    summary="Список сповіщень (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна.\n\n"
        "**search** — пошук по заголовку/тексту. **page**, **limit** — пагінація."
    ),
)
async def admin_get_notifications(
    token: str = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=500),
    search: Optional[str] = Query(None),
):
    await require_admin(token)
    query = {}
    if search:
        query["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"text": {"$regex": search, "$options": "i"}}]
    total = await db.notifications.count_documents(query)
    skip = (page - 1) * limit
    items = await db.notifications.find(query, {"_id": 0}).sort("sent_at", -1).skip(skip).limit(limit).to_list(limit)
    pages = max(1, math.ceil(total / limit))
    return {"items": items, "total": total, "page": page, "pages": pages}
 
 
@api_router.put("/admin/notifications/{notif_id}", 
    summary="Оновити сповіщення (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**notif_id** — UUID сповіщення (поле `id`). **token** — токен адміна.\n\n"
        "Body: `title` та/або `text`."
    ),
)
async def admin_update_notification(notif_id: str, data: dict, token: str = Query(...)):
    await require_admin(token)
    update = {}
    if "title" in data: update["title"] = data["title"]
    if "text" in data: update["text"] = data["text"]
    if update:
        await db.notifications.update_one({"id": notif_id}, {"$set": update})
        await db.announcements.update_one({"id": notif_id}, {"$set": update})
    return {"message": "Оновлено"}

 
@api_router.delete("/admin/notifications/{notif_id}", 
    summary="Видалити сповіщення (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**notif_id** — UUID сповіщення. **token** — токен адміна."
    ),
)
async def admin_delete_notification(notif_id: str, token: str = Query(...)):
    await require_admin(token)
    await db.notifications.delete_one({"id": notif_id})
    await db.announcements.delete_one({"id": notif_id})
    return {"message": "Видалено"}
 
 
# ══════════════ ELECTIVE SELECTIONS ══════════════
 
@api_router.get("/admin/elective-selections", 
    summary="Вибіркові дисципліни студентів (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна.\n\n"
        "**course** — фільтр за курсом (число).\n\n"
        "**group_id** — UUID групи або `all`."
    ),
)
async def admin_get_selections(
    token: str = Query(...),
    course: Optional[int] = Query(None),
    group_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=500),
):
    await require_admin(token)
    query = {"role": "student", "is_approved": True}
    if course: query["course"] = course
    if group_id and group_id != "all": query["group_id"] = group_id
    total = await db.users.count_documents(query)
    skip = (page - 1) * limit
    students = await db.users.find(query, {"_id": 0, "hashed_password": 0}).skip(skip).limit(limit).to_list(limit)
    for s in students:
        if s.get("group_id") and not s.get("group_name"):
            grp = await db.study_groups.find_one({"id": s["group_id"]}, {"_id": 0, "name": 1})
            s["group_name"] = grp["name"] if grp else s["group_id"]
    pages = max(1, math.ceil(total / limit))
    return {"items": students, "total": total, "page": page, "pages": pages}
 
 
@api_router.put("/admin/elective-selections/{user_id}", 
    summary="Змінити вибір дисциплін студента (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**user_id** — UUID студента (поле `id` з `users`).\n\n"
        "Body: `{\"selected_disciplines\": [\"Назва дисципліни 1\", \"Назва дисципліни 2\"]}`"
    ),
)
async def admin_update_selection(user_id: str, data: dict, token: str = Query(...)):
    await require_admin(token)
    await db.users.update_one({"id": user_id}, {"$set": {"elective_selections": data.get("selected_disciplines", [])}})
    return {"message": "Оновлено"}
 

@api_router.post("/admin/elective-reminder/{user_id}", 
    summary="Нагадування студенту про вибіркові (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**user_id** — UUID студента (поле `id` з `users`).\n\n"
        "**token** — токен адміна.\n\n"
        "Надсилає персональне оголошення студенту з проханням обрати вибіркові дисципліни."
    ),
)
async def admin_elective_reminder(user_id: str, token: str = Query(...)):
    admin = await require_admin(token)
    announcement = {
        "id": str(uuid.uuid4()),
        "title": "Нагадування: оберіть вибіркові дисципліни",
        "text": "Терміново оберіть вибіркові дисципліни у своєму особистому кабінеті у розділі «Вибіркові дисципліни».",
        "date": datetime.utcnow().strftime("%d.%m.%Y"),
        "target_user_id": user_id,
        "is_important": True,
        "from_admin": True,
        "target_groups": [],
    }
    await db.announcements.insert_one(announcement)
    return {"message": "Нагадування надіслано"}
 
 
@api_router.post("/admin/elective-reminder-all", 
    summary="Нагадування всім студентам без вибіркових (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна.\n\n"
        "Body (JSON): `{\"group_id\": \"UUID групи або \\\"all\\\"\"}` — фільтр за групою.\n\n"
        "Надсилає нагадування всім студентам, які ще не обрали вибіркові дисципліни."
    ),
)
async def admin_elective_reminder_all(data: dict, token: str = Query(...)):
    admin = await require_admin(token)
    group_id = data.get("group_id")
    query = {"role": "student", "is_approved": True, "elective_selections": {"$exists": False}}
    if group_id and group_id != "all":
        query["group_id"] = group_id
    students = await db.users.find(query, {"_id": 0, "id": 1}).to_list(500)
    count = 0
    for s in students:
        announcement = {
            "id": str(uuid.uuid4()),
            "title": "Нагадування: оберіть вибіркові дисципліни",
            "text": "Терміново оберіть вибіркові дисципліни у своєму особистому кабінеті.",
            "date": datetime.utcnow().strftime("%d.%m.%Y"),
            "target_user_id": s["id"],
            "is_important": True,
            "from_admin": True,
            "target_groups": [],
        }
        await db.announcements.insert_one(announcement)
        count += 1
        notif_id = str(uuid.uuid4())
        notif_title = "Нагадування: оберіть вибіркові дисципліни"
        notif_text = "Терміново оберіть вибіркові дисципліни у своєму особистому кабінеті."
        now = datetime.utcnow()
        await db.notifications.insert_one({
            "id": notif_id,
            "title": notif_title,
            "text": notif_text,
            "recipient": "students",
            "sent_at": now.isoformat(),
            "sent_by": admin.get("name", "admin"),
            "is_important": True,
            "from_admin": True,
        })
        await db.announcements.insert_one({
            "id": notif_id,
            "title": notif_title,
            "text": notif_text,
            "date": now.strftime("%d.%m.%Y"),
            "target_role": "students",
            "is_important": True,
            "from_admin": True,
            "target_groups": [],
        })
        return {"message": f"Надіслано нагадування {count} студентам"}


 
# ══════════════ SCHEDULE MANAGEMENT ══════════════
 
@api_router.get("/admin/schedule", 
    summary="Графік навчального процесу (адмін)",
    description="🔒 **Тільки адмін.** **token** — токен адміна. Повертає завантажений файл (base64).",
)
async def admin_get_schedule(token: str = Query(...)):
    await require_admin(token)
    doc = await db.schedule_config.find_one({}, {"_id": 0})
    return doc or {}
 
 
@api_router.post("/admin/schedule", 
    summary="Завантажити графік (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна.\n\n"
        "Body: `{\"file_data\": \"<base64 рядок зображення або PDF>\", \"filename\": \"schedule.pdf\"}`\n\n"
        "Файл зберігається, але **не публікується** студентам до натиснення `/admin/schedule/publish`."
    ),
)
async def admin_upload_schedule(data: dict, token: str = Query(...)):
    await require_admin(token)
    config = {
        "file_data": data.get("file_data", ""),
        "filename": data.get("filename", ""),
        "uploaded_at": datetime.utcnow().isoformat(),
        "published": False,
    }
    await db.schedule_config.replace_one({}, config, upsert=True)
    return {"message": "Завантажено", "filename": config["filename"]}
 
 
@api_router.post("/admin/schedule/publish", 
    summary="Опублікувати графік для студентів (адмін)",
    description="🔒 **Тільки адмін.** **token** — токен адміна. Робить завантажений графік видимим для всіх студентів.",
)
async def admin_publish_schedule(token: str = Query(...)):
    await require_admin(token)
    await db.schedule_config.update_one({}, {"$set": {"published": True, "published_at": datetime.utcnow().isoformat()}})
    return {"message": "Графік опубліковано для всіх студентів"}
 
 
# ══════════════ STAFF ACTIVITY REGISTRY ══════════════
 
@api_router.get("/admin/staff-publications", 
    summary="Публікації всіх викладачів (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна.\n\n"
        "**year** — фільтр за роком (рядок, напр. `2024`) або `all`.\n\n"
        "**pub_type** — тип публікації або `all`.\n\n"
        "**search** — пошук по імені викладача або назві публікації."
    ),
)
async def admin_get_staff_publications(
    token: str = Query(...),
    year: Optional[str] = Query(None),
    pub_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=500),
):
    await require_admin(token)
    pipeline = [
        {"$project": {"name": 1, "email": 1, "id": 1, "publications": 1, "_id": 0}},
        {"$unwind": {"path": "$publications", "preserveNullAndEmptyArrays": False}},
    ]
    conditions = []
    if search:
        conditions.append({"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"publications.name": {"$regex": search, "$options": "i"}},
        ]})
    if pub_type and pub_type != "all":
        conditions.append({"$or": [
            {"publications.pub_type": pub_type},
            {"publications.type": pub_type},
        ]})
    if year and year != "all":
        conditions.append({"publications.date": {"$regex": year}})
    if conditions:
        pipeline.append({"$match": {"$and": conditions} if len(conditions) > 1 else conditions[0]})
    pipeline.append({"$sort": {"publications.date": -1}})

    all_docs = await db.staff.aggregate(pipeline).to_list(5000)
    total = len(all_docs)
    skip = (page - 1) * limit
    items = all_docs[skip:skip + limit]
    pages = max(1, math.ceil(total / limit))
    result = [{"staff_id": d.get("id"), "staff_name": d["name"], "staff_email": d.get("email"), **d["publications"]} for d in items]
    return {"items": result, "total": total, "page": page, "pages": pages}
 
 
@api_router.get("/admin/staff-certificates", summary="Сертифікати всіх викладачів (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**token** — токен адміна.\n\n"
        "**year** — фільтр за роком (рядок, напр. `2024`) або `all`.\n\n"
        "**search** — пошук по імені викладача або назві публікації."
    ),
)
async def admin_get_staff_certificates(
    token: str = Query(...),
    year: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=500),
):
    await require_admin(token)
    pipeline = [
        {"$project": {"name": 1, "email": 1, "id": 1, "certificates": 1, "_id": 0}},
        {"$unwind": {"path": "$certificates", "preserveNullAndEmptyArrays": False}},
    ]
    conditions = []
    if search:
        conditions.append({"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"certificates.name": {"$regex": search, "$options": "i"}},
        ]})
    if year and year != "all":
        conditions.append({"certificates.date": {"$regex": year}})
    if conditions:
        pipeline.append({"$match": {"$and": conditions} if len(conditions) > 1 else conditions[0]})
    pipeline.append({"$sort": {"certificates.date": -1}})

    all_docs = await db.staff.aggregate(pipeline).to_list(5000)
    total = len(all_docs)
    skip = (page - 1) * limit
    items = all_docs[skip:skip + limit]
    pages = max(1, math.ceil(total / limit))
    result = [{"staff_id": d.get("id"), "staff_name": d["name"], "staff_email": d.get("email"), **d["certificates"]} for d in items]
    return {"items": result, "total": total, "page": page, "pages": pages}
 
 
@api_router.delete("/admin/staff-docs/{staff_id}/{doc_id}/{doc_type}", 
    summary="Видалити публікацію/сертифікат викладача (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**staff_id** — UUID викладача (поле `id` з `staff`).\n\n"
        "**doc_id** — UUID документа (поле `id` всередині масиву `publications` або `certificates`).\n\n"
        "**doc_type** — `publications` або `certificates`.\n\n"
        "**token** — токен адміна."
    ),
)
async def admin_delete_staff_doc(staff_id: str, doc_id: str, doc_type: str, token: str = Query(...)):
    await require_admin(token)
    
    field = "publications" if doc_type == "publications" else "certificates"
    
    result = await db.staff.update_one(
        {"id": staff_id},
        {"$pull": {field: {"id": doc_id}}}
    )
    
    if result.modified_count == 0:
        await db.staff.update_many({}, {"$pull": {field: {"id": doc_id}}})
        
    return {"message": "Видалено успішно"}

@api_router.post("/admin/specialty-pdf/{specialty_id}", 
    summary="Завантажити PDF програми спеціальності (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**specialty_id** — UUID спеціальності (поле `id` з `specialties`).\n\n"
        "**token** — токен адміна.\n\n"
        "Тіло — multipart/form-data з файлом у полі `file`."
    ),
)
async def upload_specialty_pdf(specialty_id: str, file: UploadFile = File(...), token: str = Query(...)):
    await require_admin(token)
    contents = await file.read()
    b64 = "data:application/pdf;base64," + base64.b64encode(contents).decode()
    await db.specialties.update_one(
        {"id": specialty_id},
        {"$set": {"program_pdf_url": b64}}
    )
    return {"message": "PDF завантажено", "specialty_id": specialty_id}

# ══════════════ SEED STAFF DOCS ══════════════
PUB_TYPE_MAP = {
    "Монографії": "monograph",
    "Навчальні посібники": "manual",
    "Патенти": "patent",
    "Підручники": "textbook",
    "Статті": "article",
    "Тези доповідей": "thesis",
}

@api_router.post("/seed-staff-docs", summary="Заповнити тестові документи співробітників", description=("**Лише для розробки.**\n\n"),)
async def seed_staff_docs():
    import os
    from pathlib import Path

    base = Path(__file__).parent / "test_files"
    pub_base = base / "publications"
    cert_base = base / "certificates"

    approved_staff_ids = await db.users.find(
        {"role": "staff", "is_approved": True, "staff_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "staff_id": 1}
    ).to_list(50)
    linked_ids = [u["staff_id"] for u in approved_staff_ids]
    staff_list = await db.staff.find(
        {"id": {"$in": linked_ids}},
        {"_id": 0, "id": 1, "email": 1}
    ).to_list(50)
    if not staff_list:
        return {"error": "No staff found. Run /seed first."}

    today = datetime.utcnow().date().isoformat()
    pub_count = 0
    cert_count = 0

    for staff in staff_list:
        staff_id = staff["id"]
        publications = []
        certificates = []

        all_pub_files = []
        for folder_name, pub_type in PUB_TYPE_MAP.items():
            folder = pub_base / folder_name
            if not folder.exists():
                continue
            for f in sorted(folder.iterdir()):
                if f.suffix.lower() == ".pdf":
                    all_pub_files.append((f, pub_type))

        for idx in range(len(all_pub_files)):
            if not all_pub_files:
                break
            file_path, pub_type = all_pub_files[(hash(staff_id) + idx) % len(all_pub_files)]
            file_bytes = file_path.read_bytes()
            size_kb = len(file_bytes) / 1024
            size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb/1024:.1f} MB"
            file_id = await fs.upload_from_stream(file_path.name, file_bytes)
            publications.append({
                "id": str(uuid.uuid4()),
                "name": file_path.name,
                "pub_type": pub_type,
                "date": today,
                "size": size_str,
                "file_id": str(file_id),
                "is_public": True,
            })
            pub_count += 1

        cert_files = sorted(cert_base.iterdir()) if cert_base.exists() else []
        cert_files = [f for f in cert_files if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
        for idx in range(len(cert_files)):
            if not cert_files:
                break
            file_path = cert_files[(hash(staff_id) + idx) % len(cert_files)]
            file_bytes = file_path.read_bytes()
            size_kb = len(file_bytes) / 1024
            size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb/1024:.1f} MB"
            file_id = await fs.upload_from_stream(file_path.name, file_bytes)
            certificates.append({
                "id": str(uuid.uuid4()),
                "name": file_path.name,
                "date": today,
                "size": size_str,
                "file_id": str(file_id),
                "is_public": True,
            })
            cert_count += 1

        await db.staff.update_one(
            {"id": staff_id},
            {"$set": {"publications": publications, "certificates": certificates}}
        )

    return {
        "message": "Документи додано",
        "staff_updated": len(staff_list),
        "publications_added": pub_count,
        "certificates_added": cert_count,
    }

# ══════════════ CLEAR ALL ══════════════

# @api_router.post("/clear-all")
# async def clear_all_data(token: str = Query(...)):
#     await require_admin(token)
#     collections = [
#         "staff", "news", "specialties", "department_info",
#         "laboratories", "lab_projects", "study_groups",
#         "users", "sessions", "announcements",
#         "elective_selections", "schedule_config",
#     ]
#     results = {}
#     for col in collections:
#         res = await db[col].delete_many({})
#         results[col] = res.deleted_count
#     return {"message": "Всі дані видалено", "deleted": results}

@api_router.post("/clear-all", summary="⚠️ Видалити всі дані з БД",
    description=(
        "**НЕБЕЗПЕЧНО.** Видаляє всі записи з усіх колекцій MongoDB.\n\n"
        "Ендпоїнт не захищений токеном — використовуйте лише в розробці."
    ),
)
async def clear_all_data():
    collections = [
        "staff", "news", "specialties", "department_info",
        "laboratories", "lab_projects", "study_groups",
        "users", "sessions", "announcements",
        "elective_selections", "schedule_config",
        "notifications", "exam_schedules",
    ]
    results = {}
    for col in collections:
        res = await db[col].delete_many({})
        results[col] = res.deleted_count

    sessions_res = await db.sessions.delete_many({})
    results["sessions"] = sessions_res.deleted_count

    # Clear GridFS staff files
    await db["staff_files.files"].delete_many({})
    await db["staff_files.chunks"].delete_many({})
    results["staff_files.files"] = "cleared"
    results["staff_files.chunks"] = "cleared"

    return {"message": "Всі дані видалено. Всі користувачі розлоговані.", "deleted": results}

# ══════════════ SEED ══════════════

@api_router.post("/seed", 
    summary="Заповнити БД тестовими даними",
    description="Видаляє і заново створює тестові дані. Лише для розробки.",
)
async def seed_database():
    await db.staff.delete_many({})
    await db.news.delete_many({})
    await db.specialties.delete_many({})
    await db.department_info.delete_many({})
    await db.laboratories.delete_many({})
    await db.lab_projects.delete_many({})
    await db.notifications.delete_many({})
    await db["staff_files.files"].delete_many({})
    await db["staff_files.chunks"].delete_many({})

    p_id = str(uuid.uuid4())
    k_id = str(uuid.uuid4())
    sh_id = str(uuid.uuid4())
    b_id = str(uuid.uuid4())
    t_id = str(uuid.uuid4())
    m_id = str(uuid.uuid4())
    l_id = str(uuid.uuid4())
    kr_id = str(uuid.uuid4())
    i_id = str(uuid.uuid4())
    o_id = str(uuid.uuid4())
    pl_id = str(uuid.uuid4())
    s_id = str(uuid.uuid4())

    lab_ai = str(uuid.uuid4())
    lab_net = str(uuid.uuid4())
    lab_se = str(uuid.uuid4())
    lab_db = str(uuid.uuid4())
    lab_web = str(uuid.uuid4())
    lab_cg = str(uuid.uuid4())

    staff_data = [
        {
            "id": p_id,
            "name": "Петренко Іван Олексійович",
            "name_en": "Petrenko Ivan Oleksiyovych",
            "position": {"ua": "Завідувач кафедри, Професор", "en": "Head of Department, Professor"},
            "degree": "д.т.н., професор",
            "category": "professor",
            "specialization": {"ua": "Системи штучного інтелекту та інтелектуальний аналіз даних", "en": "Artificial Intelligence Systems and Intelligent Data Analysis"},
            "photo_url": "",
            "email": "petenko.i@gmail.com",
            "description": {"ua": "Видатний фахівець у галузі штучного інтелекту з понад 20-річним досвідом наукової та викладацької діяльності. Автор понад 150 наукових праць.", "en": "A leading expert in artificial intelligence with over 20 years of research and teaching experience. Author of more than 150 scientific publications."},
            "education": [
                {"date": "1993-1998", "text": {"ua": "Київський національний університет ім. Тараса Шевченка (Магістр).", "en": "Taras Shevchenko National University of Kyiv (Master's degree)."}},
                {"date": "1998-2001", "text": {"ua": "Аспірантура, Інститут кібернетики імені В.М. Глушкова НАН України.", "en": "Postgraduate studies, V.M. Glushkov Institute of Cybernetics, NAS of Ukraine."}},
                {"date": "2012-2015", "text": {"ua": "Докторантура, Інститут програмних систем НАН України.", "en": "Doctoral studies, Institute of Software Systems, NAS of Ukraine."}}
            ],
            "career": [
                {"date": "2001-2006", "text": {"ua": "Асистент кафедри інформаційних систем.", "en": "Assistant Professor, Department of Information Systems."}},
                {"date": "2006-2015", "text": {"ua": "Доцент кафедри, к.т.н.", "en": "Associate Professor, PhD."}},
                {"date": "2015-2017", "text": {"ua": "Професор кафедри, д.т.н.", "en": "Full Professor, Doctor of Technical Sciences."}},
                {"date": "2017-теп. час", "text": {"ua": "Завідувач кафедри.", "en": "Head of Department."}}
            ],
            "teaching_experience": {"ua": "22 роки", "en": "22 years"},
            "disciplines": [
                {"ua": "Методологія побудови систем штучного інтелекту", "en": "Methodology of Building AI Systems"},
                {"ua": "Глибоке навчання та нейронні архітектури", "en": "Deep Learning and Neural Architectures"},
                {"ua": "Сучасні методи інтелектуального аналізу даних", "en": "Modern Methods of Intelligent Data Analysis"},
                {"ua": "Математичні методи оптимізації програмних систем", "en": "Mathematical Optimization Methods for Software Systems"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/petrenko-ai", "scholar": "https://scholar.google.com/citations?user=petrenko_iv"}
        },
        {
            "id": k_id,
            "name": "Коваленко Марія Степанівна",
            "name_en": "Kovalenko Maria Stepanivna",
            "position": {"ua": "Професор кафедри", "en": "Professor"},
            "degree": "д.т.н., професор",
            "category": "professor",
            "specialization": {"ua": "Високопродуктивні комп'ютерні мережі та протоколи передачі даних", "en": "High-Performance Computer Networks and Data Transfer Protocols"},
            "photo_url": "", "email": "kovalenko.m@gmail.com",
            "description": {"ua": "Доктор технічних наук, професор. Провідний експерт у галузі проектування складних мережевих інфраструктур. Має понад 25-річний досвід наукової діяльності.", "en": "Doctor of Technical Sciences, Professor. A leading expert in designing complex network infrastructures. Has over 25 years of research experience."},
            "education": [
                {"date": "1990-1995", "text": {"ua": "НТУУ КПІ, факультет технічної кібернетики.", "en": "NTUU KPI, Faculty of Technical Cybernetics."}},
                {"date": "1995-1998", "text": {"ua": "Аспірантура НТУУ КПІ (захист у сфері автоматизації проектування мереж).", "en": "Postgraduate studies at NTUU KPI (dissertation in network design automation)."}}
            ],
            "career": [
                {"date": "1998-2005", "text": {"ua": "Асистент, доцент кафедри комп'ютерних систем.", "en": "Assistant, then Associate Professor of Computer Systems."}},
                {"date": "2005-теп. час", "text": {"ua": "Професор кафедри. Керівництво лабораторією мереж та кібербезпеки.", "en": "Full Professor. Leads the Networks and Cybersecurity Laboratory."}}
            ],
            "teaching_experience": {"ua": "25 років", "en": "25 years"},
            "disciplines": [
                {"ua": "Архітектура комп'ютерних мереж", "en": "Computer Network Architecture"},
                {"ua": "Протоколи та інтерфейси розподілених систем", "en": "Protocols and Interfaces of Distributed Systems"},
                {"ua": "Адміністрування мережевих сервісів", "en": "Network Services Administration"},
                {"ua": "Технології хмарних обчислень (Cloud Computing)", "en": "Cloud Computing Technologies"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/kovalenko-networks"}
        },
        {
            "id": sh_id,
            "name": "Шевченко Олексій Петрович",
            "name_en": "Shevchenko Oleksiy Petrovych",
            "position": {"ua": "Професор кафедри", "en": "Professor"},
            "degree": "д.п.н., професор",
            "category": "professor",
            "specialization": {"ua": "Методологія програмної інженерії та Agile-трансформації", "en": "Software Engineering Methodology and Agile Transformation"},
            "photo_url": "", "email": "shevchenko.o@gmail.com",
            "description": {"ua": "Доктор педагогічних наук, професор. Поєднує багаторічний досвід практичної розробки ПЗ з науковими дослідженнями у сфері підготовки інженерів.", "en": "Doctor of Pedagogical Sciences, Professor. Combines extensive software development experience with research in training future software engineers."},
            "education": [
                {"date": "1991-1996", "text": {"ua": "Факультет комп'ютерної інженерії.", "en": "Faculty of Computer Engineering."}},
                {"date": "2000-2004", "text": {"ua": "Докторантура, Інститут педагогіки НАПН України.", "en": "Doctoral studies, Institute of Pedagogy, NAES of Ukraine."}}
            ],
            "career": [
                {"date": "1996-2003", "text": {"ua": "Старший розробник ПЗ (Senior Software Engineer).", "en": "Senior Software Engineer."}},
                {"date": "2003-теп. час", "text": {"ua": "Професор кафедри. Координатор співпраці з ІТ-компаніями.", "en": "Full Professor. Coordinator of cooperation with IT companies."}}
            ],
            "teaching_experience": {"ua": "20 років", "en": "20 years"},
            "disciplines": [
                {"ua": "Основи програмної інженерії (SWEBOK)", "en": "Fundamentals of Software Engineering (SWEBOK)"},
                {"ua": "Методології розробки Agile та DevOps", "en": "Agile and DevOps Development Methodologies"},
                {"ua": "Технології тестування та забезпечення якості ПЗ", "en": "Software Testing and Quality Assurance"},
                {"ua": "Менеджмент програмних проектів", "en": "Software Project Management"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/shevchenko-devops"}
        },
        {
            "id": b_id,
            "name": "Бондаренко Наталія Вікторівна",
            "name_en": "Bondarenko Natalia Viktorivna",
            "position": {"ua": "Доцент кафедри", "en": "Associate Professor"},
            "degree": "к.т.н., доцент",
            "category": "docent",
            "specialization": {"ua": "Проектування СУБД та Big Data аналітика", "en": "Database Management System Design and Big Data Analytics"},
            "photo_url": "", "email": "bondarenko.n@gmail.com",
            "description": {"ua": "Кандидат технічних наук, доцент. Спеціалізується на розробці архітектур розподілених баз даних та впровадженні інструментів обробки великих масивів даних.", "en": "PhD in Technical Sciences, Associate Professor. Specializes in distributed database architecture and big data processing tools."},
            "education": [
                {"date": "2000-2005", "text": {"ua": "НТУУ КПІ, факультет інформатики та обчислювальної техніки.", "en": "NTUU KPI, Faculty of Informatics and Computer Engineering."}}
            ],
            "career": [
                {"date": "2005-теп. час", "text": {"ua": "Доцент кафедри. Відповідальна за навчальні плани з дисциплін зберігання даних.", "en": "Associate Professor. Responsible for curricula in data storage disciplines."}}
            ],
            "teaching_experience": {"ua": "18 років", "en": "18 years"},
            "disciplines": [
                {"ua": "Організація баз даних та знань (SQL)", "en": "Database and Knowledge Organization (SQL)"},
                {"ua": "Адміністрування сучасних СУБД (PostgreSQL, MongoDB)", "en": "Modern DBMS Administration (PostgreSQL, MongoDB)"},
                {"ua": "Технології обробки великих даних (Big Data)", "en": "Big Data Processing Technologies"},
                {"ua": "Проектування інформаційних систем та сховищ даних", "en": "Information Systems and Data Warehouse Design"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"scholar": "https://scholar.google.com"}
        },
        {
            "id": t_id,
            "name": "Ткаченко Сергій Михайлович",
            "name_en": "Tkachenko Serhiy Mykhaylovych",
            "position": {"ua": "Доцент кафедри", "en": "Associate Professor"},
            "degree": "к.т.н., доцент",
            "category": "docent",
            "specialization": {"ua": "Full-stack веб-розробка та архітектура високонавантажених систем", "en": "Full-stack Web Development and High-load System Architecture"},
            "photo_url": "", "email": "tkachenko.s@gmail.com",
            "description": {"ua": "Кандидат технічних наук, доцент. Провідний викладач у сфері сучасних веб-технологій. Спеціалізується на мікросервісній архітектурі та оптимізації фронтенд-додатків. Керівник лабораторії веб-технологій.", "en": "PhD in Technical Sciences, Associate Professor. A leading instructor in modern web technologies. Specializes in microservice architecture and front-end performance optimization. Head of the Web Technologies Lab."},
            "education": [
                {"date": "2002-2007", "text": {"ua": "Факультет комп'ютерних наук (Програмне забезпечення автоматизованих систем).", "en": "Faculty of Computer Science (Software for Automated Systems)."}},
                {"date": "2007-2010", "text": {"ua": "Аспірантура (захист у сфері веб-орієнтованих інформаційних систем).", "en": "Postgraduate studies (dissertation in web-oriented information systems)."}},
                {"date": "2018-2019", "text": {"ua": "Стажування 'Advanced React & Node.js Architecture'.", "en": "Professional training in 'Advanced React & Node.js Architecture'."}}
            ],
            "career": [
                {"date": "2007-2012", "text": {"ua": "Асистент кафедри, суміщення з роботою Full-stack розробником.", "en": "Assistant Professor, combining teaching with full-stack development."}},
                {"date": "2012-2015", "text": {"ua": "Старший викладач кафедри.", "en": "Senior Lecturer."}},
                {"date": "2015-теп. час", "text": {"ua": "Доцент кафедри. Очільник лабораторії веб-технологій.", "en": "Associate Professor. Head of the Web Technologies Laboratory."}}
            ],
            "teaching_experience": {"ua": "16 років", "en": "16 years"},
            "disciplines": [
                {"ua": "Сучасні технології веб-розробки (HTML5, CSS3, ES6+)", "en": "Modern Web Development Technologies (HTML5, CSS3, ES6+)"},
                {"ua": "Розробка інтерфейсів на базі React та Next.js", "en": "Interface Development with React and Next.js"},
                {"ua": "Серверне програмування (FastAPI, Node.js)", "en": "Server-side Programming (FastAPI, Node.js)"},
                {"ua": "Архітектура хмарних веб-застосунків", "en": "Cloud Web Application Architecture"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/tkachenko-web", "github": "https://github.com/tkachenko-dev"}
        },
        {
            "id": m_id,
            "name": "Мельник Оксана Іванівна",
            "name_en": "Melnyk Oksana Ivanivna",
            "position": {"ua": "Доцент кафедри", "en": "Associate Professor"},
            "degree": "к.т.н., доцент",
            "category": "docent",
            "specialization": {"ua": "Теорія алгоритмів, структури даних та спортивне програмування", "en": "Algorithm Theory, Data Structures and Competitive Programming"},
            "photo_url": "", "email": "melnyk.o@gmail.com",
            "description": {"ua": "Кандидат технічних наук, доцент. Провідний спеціаліст у галузі алгоритмічних рішень та оптимізації обчислювальних процесів. Багаторічний тренер збірної з олімпіадного програмування.", "en": "PhD in Technical Sciences, Associate Professor. A leading expert in algorithmic solutions and computational optimization. Long-time head coach of the university's competitive programming team."},
            "education": [
                {"date": "2001-2006", "text": {"ua": "НТУУ КПІ, факультет прикладної математики (Магістр з системного аналізу).", "en": "NTUU KPI, Faculty of Applied Mathematics (Master's in Systems Analysis)."}},
                {"date": "2006-2009", "text": {"ua": "Аспірантура НТУУ КПІ (захист у сфері моделювання складних систем).", "en": "Postgraduate studies at NTUU KPI (PhD in complex systems modeling)."}},
                {"date": "2015", "text": {"ua": "Сертифікований курс з алгоритмічної складності.", "en": "Certified professional development course in computational complexity."}}
            ],
            "career": [
                {"date": "2006-2010", "text": {"ua": "Асистент кафедри, початок тренерської діяльності.", "en": "Assistant Professor, began coaching competitive programming."}},
                {"date": "2010-2014", "text": {"ua": "Старший викладач, авторські спецкурси з підготовки до олімпіад.", "en": "Senior Lecturer, developed specialized olympiad preparation courses."}},
                {"date": "2014-теп. час", "text": {"ua": "Доцент кафедри. Координатор гуртка 'Алгоритміст'.", "en": "Associate Professor. Coordinator of the 'Algorithmist' research group."}}
            ],
            "teaching_experience": {"ua": "17 років", "en": "17 years"},
            "disciplines": [
                {"ua": "Алгоритми та структури даних (Advanced)", "en": "Algorithms and Data Structures (Advanced)"},
                {"ua": "Теорія графів та її застосування в ІТ", "en": "Graph Theory and Its Applications in IT"},
                {"ua": "Методи розв'язання олімпіадних задач", "en": "Methods for Solving Competitive Programming Problems"},
                {"ua": "Математичні основи аналізу алгоритмів", "en": "Mathematical Foundations of Algorithm Analysis"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"scholar": "https://scholar.google.com/citations?user=melnyk_oi", "linkedin": "https://linkedin.com/in/oksana-melnyk-algo"}
        },
        {
            "id": l_id,
            "name": "Лисенко Андрій Юрійович",
            "name_en": "Lysenko Andrii Yuriiovych",
            "position": {"ua": "Старший викладач кафедри", "en": "Senior Lecturer"},
            "degree": "к.т.н.",
            "category": "senior_lecturer",
            "specialization": {"ua": "Машинне навчання, інтелектуальний аналіз даних та Python-розробка", "en": "Machine Learning, Intelligent Data Analysis and Python Development"},
            "photo_url": "", "email": "lysenko.a@gmail.com",
            "description": {"ua": "Кандидат технічних наук. Експерт у галузі AI з використанням Python. Спеціалізується на глибокому навчанні (Deep Learning), комп'ютерному зорі та предиктивних моделях. Активно впроваджує MLOps у навчальний процес.", "en": "PhD in Technical Sciences. Expert in AI development using the Python ecosystem. Specializes in Deep Learning, computer vision, and predictive models. Actively integrates MLOps practices into the curriculum."},
            "education": [
                {"date": "2009-2014", "text": {"ua": "Факультет інформаційних технологій (Інформаційні управляючі системи).", "en": "Faculty of Information Technologies (Information Control Systems)."}},
                {"date": "2014-2017", "text": {"ua": "Аспірантура за спеціальністю 'Комп'ютерні науки'.", "en": "Postgraduate studies in 'Computer Science'."}},
                {"date": "2021", "text": {"ua": "Сертифікація 'Deep Learning Specialization' від DeepLearning.AI.", "en": "International certification 'Deep Learning Specialization' from DeepLearning.AI."}}
            ],
            "career": [
                {"date": "2014-2018", "text": {"ua": "Асистент кафедри, паралельна робота Data Scientist.", "en": "Assistant Professor, concurrent work as a Data Scientist."}},
                {"date": "2018-2020", "text": {"ua": "Викладач кафедри, курси з аналізу даних на Python.", "en": "Lecturer, developing data analysis courses in Python."}},
                {"date": "2020-теп. час", "text": {"ua": "Старший викладач. Координатор проектів лабораторії AI.", "en": "Senior Lecturer. Coordinator of AI Lab research projects."}}
            ],
            "teaching_experience": {"ua": "10 років", "en": "10 years"},
            "disciplines": [
                {"ua": "Основи програмування на Python (Pandas, NumPy, Scikit-learn)", "en": "Python Programming Fundamentals (Pandas, NumPy, Scikit-learn)"},
                {"ua": "Машинне навчання та розпізнавання образів", "en": "Machine Learning and Pattern Recognition"},
                {"ua": "Методи візуалізації даних", "en": "Data Visualization Methods"},
                {"ua": "Вступ до штучних нейронних мереж", "en": "Introduction to Artificial Neural Networks"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"},
                {"ua": "126 Інформаційні системи та технології", "en": "126 Information Systems and Technologies"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/lysenko-ai-ds", "github": "https://github.com/lysenko-andrii"}
        },
        {
            "id": kr_id,
            "name": "Кравченко Юлія Олексіївна",
            "name_en": "Kravchenko Yuliya Oleksiyivn",
            "position": {"ua": "Старший викладач кафедри", "en": "Senior Lecturer"},
            "degree": "к.т.н.",
            "category": "senior_lecturer",
            "specialization": {"ua": "Комп'ютерна графіка, AR/VR технології та UX/UI дизайн", "en": "Computer Graphics, AR/VR Technologies and UX/UI Design"},
            "photo_url": "", "email": "kravchenko.y@gmail.com",
            "description": {"ua": "Кандидат технічних наук. Спеціалізується на інтерактивних графічних системах та дослідженні UX. Провідний фахівець у сфері іммерсивних технологій (AR/VR). Керівниця лабораторії комп'ютерної графіки.", "en": "PhD in Technical Sciences. Specializes in interactive graphical systems and UX research. Leading expert in immersive technologies (AR/VR). Head of the Computer Graphics Laboratory."},
            "education": [
                {"date": "2010-2015", "text": {"ua": "Факультет інформаційних технологій (Системи та методи прийняття рішень).", "en": "Faculty of Information Technologies (Systems and Decision-Making Methods)."}},
                {"date": "2015-2018", "text": {"ua": "Аспірантура за спеціальністю 'Інформаційні технології'.", "en": "Postgraduate studies in 'Information Technologies'."}},
                {"date": "2022", "text": {"ua": "Сертифікація 'Advanced User Experience Design' (Google / Coursera).", "en": "Certification 'Advanced User Experience Design' (Google / Coursera)."}}
            ],
            "career": [
                {"date": "2015-2019", "text": {"ua": "Асистент кафедри, суміщення з роботою UI/UX дизайнером.", "en": "Assistant Professor, combining teaching with UI/UX design work."}},
                {"date": "2019-2021", "text": {"ua": "Викладач кафедри, нові курси з мобільної розробки та AR/VR.", "en": "Lecturer, initiating new courses in mobile development and AR/VR."}},
                {"date": "2021-теп. час", "text": {"ua": "Старший викладач. Керівниця напрямку візуальних систем та UX-аудиту.", "en": "Senior Lecturer. Head of the visual systems and UX audit research direction."}}
            ],
            "teaching_experience": {"ua": "9 років", "en": "9 years"},
            "disciplines": [
                {"ua": "Основи комп'ютерної графіки та візуалізації", "en": "Fundamentals of Computer Graphics and Visualization"},
                {"ua": "Проектування UI/UX для веб та мобільних платформ", "en": "UI/UX Design for Web and Mobile Platforms"},
                {"ua": "Технології віртуальної та доповненої реальності", "en": "Virtual and Augmented Reality Technologies"},
                {"ua": "Психологія взаємодії людина-комп'ютер", "en": "Human-Computer Interaction Psychology"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"},
                {"ua": "123 Комп'ютерна інженерія", "en": "123 Computer Engineering"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/kravchenko-yulia-ux", "behance": "https://www.behance.net/kravchenko-design"}
        },
        {
            "id": i_id,
            "name": "Іванов Дмитро Сергійович",
            "name_en": "Ivanov Dmytro Serhiyovych",
            "position": {"ua": "Старший викладач кафедри", "en": "Senior Lecturer"},
            "degree": "к.т.н.",
            "category": "senior_lecturer",
            "specialization": {"ua": "Системне програмування та архітектура операційних систем", "en": "System Programming and Operating System Architecture"},
            "photo_url": "", "email": "ivanov.d@gmail.com",
            "description": {"ua": "Кандидат технічних наук. Експерт у системному ПЗ та адмініструванні Unix-подібних систем. Спеціалізується на низькорівневому програмуванні, оптимізації ОС та розробці драйверів пристроїв.", "en": "PhD in Technical Sciences. Expert in system software development and Unix-like system administration. Specializes in low-level programming, OS performance optimization, and device driver development."},
            "education": [
                {"date": "2008-2013", "text": {"ua": "Факультет кібернетики (Системне програмування).", "en": "Faculty of Cybernetics (System Programming)."}},
                {"date": "2013-2016", "text": {"ua": "Аспірантура, захист у сфері паралельних обчислень.", "en": "Postgraduate studies, dissertation in parallel computing."}},
                {"date": "2020", "text": {"ua": "Сертифікований курс 'Advanced Linux Kernel Engineering'.", "en": "Certified course 'Advanced Linux Kernel Engineering'."}}
            ],
            "career": [
                {"date": "2013-2017", "text": {"ua": "Асистент кафедри, паралельно — системний архітектор.", "en": "Assistant Professor, concurrent work as a systems architect."}},
                {"date": "2017-2021", "text": {"ua": "Викладач кафедри, лабораторні практикуми з системного програмування.", "en": "Lecturer, developing practical labs in system programming."}},
                {"date": "2021-теп. час", "text": {"ua": "Старший викладач. Куратор напрямку 'CyberInfrastructure'.", "en": "Senior Lecturer. Curator of the 'CyberInfrastructure' student direction."}}
            ],
            "teaching_experience": {"ua": "12 років", "en": "12 years"},
            "disciplines": [
                {"ua": "Архітектура операційних систем", "en": "Operating System Architecture"},
                {"ua": "Системне програмування (C/C++)", "en": "System Programming (C/C++)"},
                {"ua": "Адміністрування ОС Linux", "en": "Linux OS Administration"},
                {"ua": "Розробка паралельних та розподілених обчислень", "en": "Parallel and Distributed Computing Development"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"},
                {"ua": "123 Комп'ютерна інженерія", "en": "123 Computer Engineering"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/ivanov-system-dev", "github": "https://github.com/ivanov-kernel"}
        },
        {
            "id": o_id,
            "name": "Олійник Тетяна Василівна",
            "name_en": "Oliynyk Tetiana Vasylivna",
            "position": {"ua": "Старший викладач кафедри", "en": "Senior Lecturer"},
            "degree": "к.т.н.",
            "category": "senior_lecturer",
            "specialization": {"ua": "Кібербезпека, криптографічний захист інформації та мережева безпека", "en": "Cybersecurity, Cryptographic Information Protection and Network Security"},
            "photo_url": "", "email": "oliynyk.t@gmail.com",
            "description": {"ua": "Кандидат технічних наук. Спеціаліст із захисту інформаційних систем. Досліджує протидію кіберзагрозам у розподілених мережах та активно готує студентів до CTF-змагань.", "en": "PhD in Technical Sciences. Specialist in information system protection. Researches cyber threat countermeasures in distributed networks and actively prepares students for CTF competitions."},
            "education": [
                {"date": "2009-2014", "text": {"ua": "НАУ, факультет кібербезпеки (Безпека інформаційних систем).", "en": "NAU, Faculty of Cybersecurity (Security of Information Systems)."}},
                {"date": "2014-2017", "text": {"ua": "Аспірантура за спеціальністю 'Методи захисту інформації'.", "en": "Postgraduate studies in 'Information Protection Methods'."}},
                {"date": "2023", "text": {"ua": "Стажування 'Certified Ethical Hacker (CEH) v12'.", "en": "Professional development 'Certified Ethical Hacker (CEH) v12'."}}
            ],
            "career": [
                {"date": "2014-2018", "text": {"ua": "Асистент кафедри, консультування з аудиту інформаційної безпеки.", "en": "Assistant Professor, consulting in information security audit."}},
                {"date": "2018-2021", "text": {"ua": "Викладач кафедри, модернізація лабораторної бази.", "en": "Lecturer, modernizing the laboratory base."}},
                {"date": "2021-теп. час", "text": {"ua": "Старший викладач. Координатор напрямку 'Cyber Defense'.", "en": "Senior Lecturer. Coordinator of the 'Cyber Defense' direction."}}
            ],
            "teaching_experience": {"ua": "11 років", "en": "11 years"},
            "disciplines": [
                {"ua": "Основи кібербезпеки та технічного захисту інформації", "en": "Fundamentals of Cybersecurity and Information Protection"},
                {"ua": "Прикладна криптографія", "en": "Applied Cryptography"},
                {"ua": "Безпека веб-застосунків та хмарних сервісів", "en": "Web Application and Cloud Service Security"},
                {"ua": "Управління інцидентами інформаційної безпеки", "en": "Information Security Incident Management"}
            ],
            "specialties_taught": [
                {"ua": "121 Інженерія програмного забезпечення", "en": "121 Software Engineering"},
                {"ua": "122 Комп'ютерні науки", "en": "122 Computer Science"},
                {"ua": "125 Кібербезпека", "en": "125 Cybersecurity"}
            ],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/oliynyk-cybersecurity", "scholar": "https://scholar.google.com"}
        },
        {
            "id": pl_id,
            "name": "Поліщук Василь Миколайович",
            "name_en": "Polishchuk Vasyl Mykolayovych",
            "position": {"ua": "Старший інженер кафедри", "en": "Senior Department Engineer"},
            "degree": "Інженер",
            "category": "engineering",
            "specialization": {"ua": "Системне адміністрування та мережева інфраструктура", "en": "System Administration and Network Infrastructure Management"},
            "photo_url": "", "email": "polishchuk.v@gmail.com",
            "description": {"ua": "Провідний спеціаліст з підтримки технічної бази кафедри. Відповідає за функціонування серверного обладнання, локальних мереж та лабораторій штучного інтелекту та кібербезпеки.", "en": "Leading specialist in maintaining the department's technical infrastructure. Responsible for server equipment, local networks, and AI and cybersecurity laboratories."},
            "education": [
                {"date": "2005-2010", "text": {"ua": "Факультет авіаційних систем (Інформаційні технології проектування).", "en": "Faculty of Aviation Systems (Information Design Technologies)."}},
                {"date": "2015", "text": {"ua": "Сертифікація 'Advanced Network Administration' (MikroTik/Cisco).", "en": "Certification 'Advanced Network Administration' (MikroTik/Cisco)."}}
            ],
            "career": [
                {"date": "2010-2014", "text": {"ua": "Інженер технічної підтримки в Data Center.", "en": "Technical Support Engineer at a Data Center."}},
                {"date": "2014-2019", "text": {"ua": "Провідний системний адміністратор IT-інфраструктур.", "en": "Lead system administrator of IT infrastructures."}},
                {"date": "2019-теп. час", "text": {"ua": "Старший інженер кафедри. Відповідальний за модернізацію техніки.", "en": "Senior Department Engineer. Responsible for modernizing the computer equipment pool."}}
            ],
            "teaching_experience": {"ua": "Не викладає (технічна підтримка)", "en": "Not teaching (technical support)"},
            "disciplines": [], "specialties_taught": [],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/polishchuk-vasyl-sysadmin"}
        },
        {
            "id": s_id,
            "name": "Ситник Лариса Олексіївна",
            "name_en": "Sytnyk Larisa Oleksiivna",
            "position": {"ua": "Лаборант кафедри", "en": "Department Laboratory Assistant"},
            "degree": "Технік",
            "category": "engineering",
            "specialization": {"ua": "Організація та технічне забезпечення навчальних лабораторій", "en": "Organization and Technical Support of Teaching Laboratories"},
            "photo_url": "", "email": "sytnyk.l@gmail.com",
            "description": {"ua": "Відповідальна за організаційне забезпечення навчального процесу в комп'ютерних класах. Здійснює контроль за станом лабораторного обладнання та веде облік програмного забезпечення.", "en": "Responsible for the organizational support of the educational process in computer labs. Monitors laboratory equipment and maintains software records."},
            "education": [
                {"date": "2012-2016", "text": {"ua": "Технічний коледж (Обслуговування комп'ютерних систем та мереж).", "en": "Technical College (Computer Systems and Network Maintenance)."}},
                {"date": "2018", "text": {"ua": "Курси 'Адміністрування локальних мереж малих офісів'.", "en": "Professional development 'Small Office Local Network Administration'."}}
            ],
            "career": [
                {"date": "2016-2019", "text": {"ua": "Технік-оператор у мультимедійному центрі навчального закладу.", "en": "Multimedia center operator at an educational institution."}},
                {"date": "2019-теп. час", "text": {"ua": "Лаборант кафедри. Стабільна робота ПЗ у навчальних лабораторіях.", "en": "Department Laboratory Assistant. Ensuring stable software operation in teaching labs."}}
            ],
            "teaching_experience": {"ua": "Не викладає (навчально-допоміжний персонал)", "en": "Not teaching (educational support staff)"},
            "disciplines": [], "specialties_taught": [],
            "publications": [], "certificates": [],
            "social_links": {"linkedin": "https://linkedin.com/in/sytnyk-larisa-tech"}
        },
    ]

    sp1 = str(uuid.uuid4()); sp2 = str(uuid.uuid4()); sp3 = str(uuid.uuid4())
    specialties_data = [
        {
            "id": sp1,
            "title": {"ua": "Інженерія програмного забезпечення — Бакалавр", "en": "Software Engineering — Bachelor"},
            "code": "121", "degree_level": "bachelor",
            "duration": {"ua": "3 роки 10 місяців", "en": "3 years 10 months"},
            "student_count": 120,
            "description": {"ua": "Професійна підготовка архітекторів та розробників програмних систем. Програма фокусується на створенні надійного та масштабованого ПЗ, охоплюючи всі етапи: від аналізу вимог до тестування та супроводу складних цифрових продуктів.", "en": "Professional training for software architects and developers. The program focuses on creating reliable and scalable software, covering all stages from requirements analysis to testing and maintenance of complex digital products."},
            "competencies": [
                {"ua": "Глибоке знання алгоритмів, структур даних та дискретної математики.", "en": "Deep knowledge of algorithms, data structures, and discrete mathematics."},
                {"ua": "Володіння повним циклом розробки (SDLC): Agile, Scrum, DevOps.", "en": "Proficiency in the full development lifecycle (SDLC): Agile, Scrum, DevOps."},
                {"ua": "Розробка розподілених систем, мікросервісів та хмарних рішень.", "en": "Development of distributed systems, microservices, and cloud solutions."},
                {"ua": "Забезпечення якості (QA) через автоматизоване тестування та CI/CD.", "en": "Quality assurance (QA) through automated testing and CI/CD processes."},
                {"ua": "Командна взаємодія та управління IT-проектами.", "en": "Teamwork and IT project management."}
            ],
            "learning_outcomes": [
                {"ua": "ПР 1. Застосовувати знання математики для моделювання реальних об'єктів у коді.", "en": "LO 1. Apply mathematical knowledge to model real-world objects in software code."},
                {"ua": "ПР 2. Обирати та реалізовувати оптимальні алгоритми з урахуванням складності.", "en": "LO 2. Select and implement optimal algorithms considering computational complexity."},
                {"ua": "ПР 3. Проектувати архітектуру ПЗ з використанням патернів (GoF, SOLID).", "en": "LO 3. Design software architecture using patterns (GoF, SOLID, GRASP)."},
                {"ua": "ПР 4. Будувати високонавантажені системи з Redis, MongoDB, PostgreSQL та Docker.", "en": "LO 4. Build high-load systems using Redis, MongoDB, PostgreSQL, and Docker."},
                {"ua": "ПР 5. Застосовувати нейронні мережі для NLP та комп'ютерного зору.", "en": "LO 5. Apply neural networks for natural language processing (NLP) and computer vision."}
            ],
            "additional_text": {"ua": "Наша освітня програма розроблена у тісній співпраці з провідними IT-компаніями. Це 4 роки інтенсивної практики, де кожен семестровий проект може стати основою вашого майбутнього стартапу.", "en": "Our educational program was developed in close cooperation with leading IT companies. It's 4 years of intensive practice, where every semester project can become the foundation of your future startup."},
            "program_pdf_url": "/static/docs/curriculum_121_2026.pdf",
            "image_url": "https://images.unsplash.com/photo-1763568258338-94886e7533ab?q=80&w=1170&auto=format&fit=crop"
        },
        {
            "id": sp2,
            "title": {"ua": "Інженерія програмного забезпечення — Магістр", "en": "Software Engineering — Master"},
            "code": "121", "degree_level": "master",
            "duration": {"ua": "1 рік 4 місяці / 1 рік 9 місяців", "en": "1 year 4 months / 1 year 9 months"},
            "student_count": 45,
            "description": {"ua": "Поглиблена науково-практична підготовка експертів з проектування складних програмних систем. Програма зосереджена на стратегічному управлінні розробкою та впровадженні інноваційних технологій (AI, Blockchain, Big Data).", "en": "Advanced academic and practical training for experts in complex software system design. The program focuses on strategic development management and implementing innovative technologies (AI, Blockchain, Big Data)."},
            "competencies": [
                {"ua": "Проектування розподілених архітектур (Cloud-Native, Serverless).", "en": "Design of distributed architectures (Cloud-Native, Serverless)."},
                {"ua": "Методологія наукових досліджень та аналіз трендів у Software Engineering.", "en": "Research methodology and analysis of current trends in Software Engineering."},
                {"ua": "Управління великими IT-департаментами за методологіями SAFe/LeSS.", "en": "Management of large IT departments using SAFe/LeSS methodologies."},
                {"ua": "Розробка та інтеграція інтелектуальних систем на базі Deep Learning.", "en": "Development and integration of intelligent systems based on Deep Learning."}
            ],
            "learning_outcomes": [
                {"ua": "ПР 01. Організовувати та проводити самостійні наукові дослідження.", "en": "LO 01. Organize and conduct independent scientific and applied research."},
                {"ua": "ПР 02. Розробляти та обґрунтовувати складні архітектурні рішення (Enterprise Solutions).", "en": "LO 02. Develop and justify complex architectural solutions for enterprise systems."},
                {"ua": "ПР 03. Керувати ризиками та бюджетами в масштабних IT-проектах.", "en": "LO 03. Manage risks, schedules, and budgets in large-scale IT projects."},
                {"ua": "ПР 04. Використовувати методи формальної верифікації для критичного ПЗ.", "en": "LO 04. Use formal verification and validation methods for mission-critical software."}
            ],
            "additional_text": {"ua": "Магістратура на нашій кафедрі — це містком між академічною наукою та топ-менеджментом в IT. Програма передбачає гнучкий графік та стажування у R&D відділах технологічних компаній.", "en": "The master's program at our department bridges academic science and IT top management. The program allows a flexible schedule and includes internships at R&D departments of technology companies."},
            "program_pdf_url": "/static/docs/master_curriculum_121_2026.pdf",
            "image_url": "https://images.unsplash.com/photo-1763568258338-94886e7533ab?q=80&w=1170&auto=format&fit=crop"
        },
        {
            "id": sp3,
            "title": {"ua": "Інженерія програмного забезпечення — Доктор філософії (PhD)", "en": "Software Engineering — Doctor of Philosophy (PhD)"},
            "code": "121", "degree_level": "phd",
            "duration": {"ua": "4 роки", "en": "4 years"},
            "student_count": 12,
            "description": {"ua": "Найвищий рівень академічної кваліфікації для підготовки науково-педагогічних кадрів світового рівня. Програма передбачає оригінальний науковий внесок у сферу інженерії ПЗ та розробку нових методологій.", "en": "The highest level of academic qualification for training world-class research and teaching staff. The program involves an original scientific contribution to software engineering and the development of new methodologies."},
            "competencies": [
                {"ua": "Ініціювати та проводити комплексні наукові дослідження з академічною доброчесністю.", "en": "Initiate and conduct comprehensive research with high academic integrity."},
                {"ua": "Критичний аналіз та синтез нових ідей у сфері комп'ютерних наук.", "en": "Critical analysis, evaluation, and synthesis of new ideas in computer science."},
                {"ua": "Наукова комунікація: представлення результатів на конференціях Scopus/CORE.", "en": "Scientific communication: presenting results at Scopus/CORE conferences and journals."},
                {"ua": "Управління науковими проектами та залучення грантів (Horizon Europe, Erasmus+).", "en": "Managing research projects and attracting grant funding (Horizon Europe, Erasmus+)."}
            ],
            "learning_outcomes": [
                {"ua": "ПР 01. Глибоке розуміння сучасних концепцій інженерії ПЗ на межі наукових знань.", "en": "LO 01. Deep understanding of current software engineering concepts at the frontier of knowledge."},
                {"ua": "ПР 02. Створення нових знань через оригінальне дослідження та захист дисертації.", "en": "LO 02. Creation of new knowledge through original peer-reviewed research and dissertation defense."},
                {"ua": "ПР 03. Формулювати наукові гіпотези та перевіряти їх математичним моделюванням.", "en": "LO 03. Formulate scientific hypotheses and test them using mathematical modeling."}
            ],
            "additional_text": {"ua": "Наші аспіранти працюють під керівництвом провідних докторів наук у сучасних лабораторіях. Програма інтегрована у європейський дослідницький простір із можливістю стажувань в ЄС та США.", "en": "Our PhD students work under the supervision of leading doctors of science in modern research laboratories. The program is integrated into the European Research Area with internship opportunities in the EU and USA."},
            "program_pdf_url": "/static/docs/phd_program_121_2026.pdf",
            "image_url": "https://images.unsplash.com/photo-1763568258338-94886e7533ab?q=80&w=1170&auto=format&fit=crop"
        }
    ]

    news_data = [
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Тріумф на міжнародній арені: Студенти кафедри здобули перемогу на регіональному етапі ACM ICPC", "en": "International Triumph: Department Students Win at the Regional Stage of ACM ICPC"},
            "content": {"ua": "Збірна команда нашої кафедри продемонструвала вражаючий результат на регіональному етапі престижної міжнародної студентської олімпіади з програмування ACM ICPC. У запеклій боротьбі з представниками провідних технічних ЗВО країни, наші студенти посіли почесне призове місце, розв'язавши складні алгоритмічні задачі за рекордний час.\n\nЦей успіх став результатом системної підготовки в межах наукового гуртка 'Алгоритміст' під керівництвом доцента Мельник Оксани Іванівни. Команда продемонструвала не лише глибокі знання структур даних, а й зразкову командну роботу та витримку. Ми пишаємося нашими вихованцями та бажаємо їм успіху на наступному етапі змагань!", "en": "Our department's team delivered an impressive result at the regional stage of the prestigious ACM ICPC international student programming olympiad. In fierce competition with representatives of the country's leading technical universities, our students claimed an honorary prize position by solving complex algorithmic problems in record time.\n\nThis success was the result of systematic training within the 'Algorithmist' research club under the supervision of Associate Professor Oksana Ivanivna Melnyk. The team demonstrated not only deep knowledge of data structures, but also exemplary teamwork and composure. We are proud of our students and wish them success at the next stage of the competition!"},
            "category": "competitions",
            "date": "2024-05-20",
            "image_url": "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=1200&q=80",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
                "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
                "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
                "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80"
            ],
            "reading_time": 3,
            "tags": [{"ua": "змагання", "en": "competitions"}, {"ua": "ACM ICPC", "en": "ACM ICPC"}, {"ua": "програмування", "en": "programming"}, {"ua": "перемога", "en": "victory"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Нові горизонти для кар'єри: Кафедра розширює коло індустріальних партнерів", "en": "New Career Horizons: Department Expands Its Circle of Industry Partners"},
            "content": {"ua": "Кафедра офіційно уклала низку меморандумів про стратегічне партнерство з провідними IT-компаніями регіону. Ця співпраця передбачає не лише оновлення матеріально-технічної бази лабораторій, а й запуск програм дуальної освіти.\n\nЗавдяки новим угодам, студенти отримають пріоритетне право на проходження виробничої практики з можливістю подальшого працевлаштування. Представники компаній долучаться до рецензування дипломних проектів та проведення гостьових лекцій, що дозволить максимально наблизити навчальний процес до реальних вимог сучасного ринку праці. Перші воркшопи від партнерів стартують уже наступного місяця!", "en": "The department has officially signed a series of strategic partnership memoranda with leading IT companies in the region. This cooperation involves not only upgrading the laboratory infrastructure, but also launching dual education programs.\n\nThanks to the new agreements, students will receive priority access to internships with the opportunity for subsequent employment. Company representatives will participate in reviewing graduation projects and delivering guest lectures, which will bring the educational process as close as possible to the real demands of the modern labor market. The first partner workshops kick off next month!"},
            "category": "general",
            "date": "2024-05-15",
            "image_url": "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=80",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80",
                "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80",
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
                "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80"
            ],
            "reading_time": 2,
            "tags": [{"ua": "партнерство", "en": "partnership"}, {"ua": "IT-індустрія", "en": "IT industry"}, {"ua": "кар'єра", "en": "career"}, {"ua": "практика", "en": "internship"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Науковий прорив: На кафедрі відбувся успішний захист дисертації на ступінь PhD", "en": "Scientific Breakthrough: Successful PhD Dissertation Defense Held at the Department"},
            "content": {"ua": "Радісна подія для наукової спільноти нашої кафедри! Аспірант кафедри успішно захистив дисертаційне дослідження на здобуття ступеня доктора філософії (PhD) за спеціальністю 121 «Інженерія програмного забезпечення».\n\nНаукова робота, присвячена оптимізації розподілених систем, отримала високі оцінки від офіційних опонентів та членів спеціалізованої вченої ради. Члени ради відзначили високий рівень практичної цінності розроблених методів та їх актуальність для сучасного IT-ринку. Щиро вітаємо новоспеченого доктора філософії та його наукового керівника з цим визначним досягненням і бажаємо подальших успіхів у науковій ниві!", "en": "A joyful event for the academic community of our department! A postgraduate student of the department successfully defended their doctoral dissertation for the degree of Doctor of Philosophy (PhD) in specialty 121 'Software Engineering'.\n\nThe research work, dedicated to the optimization of distributed systems, received high marks from the official opponents and members of the specialized academic council. The council members noted the high level of practical value of the developed methods and their relevance to the modern IT market. We sincerely congratulate the newly minted Doctor of Philosophy and their academic supervisor on this outstanding achievement and wish them further success in the academic field!"},
            "category": "achievements",
            "date": "2024-05-10",
            "image_url": "https://images.unsplash.com/photo-1575029645540-d0873b4c25d1?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
                "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80"
            ],
            "reading_time": 3,
            "tags": [{"ua": "наука", "en": "science"}, {"ua": "PhD", "en": "PhD"}, {"ua": "захист", "en": "defense"}, {"ua": "аспірантура", "en": "postgraduate studies"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Важливо: Графік подання та захисту курсових робіт на весняний семестр", "en": "Important: Schedule for Submission and Defense of Term Papers for the Spring Semester"},
            "content": {"ua": "Шановні студенти! Нагадуємо вам про наближення кінцевих термінів подання курсових робіт. Згідно з графіком навчального процесу, електронні версії робіт мають бути завантажені в систему для перевірки на плагіат не пізніше, ніж за тиждень до дати захисту.\n\nЗверніть увагу, що для отримання допуску до захисту необхідно вчасно надати керівнику пояснювальну записку та результати програмної реалізації (для інженерних спеціальностей). Студенти, які не завантажать роботи вчасно, не будуть допущені до основної сесії. У разі виникнення технічних питань або потреби в уточненні графіку, будь ласка, звертайтеся до відповідальних методистів на кафедрі або у деканат у робочі години.", "en": "Dear students! We remind you of the approaching deadlines for submitting term papers. According to the academic schedule, electronic versions of papers must be uploaded to the plagiarism-checking system no later than one week before the defense date.\n\nPlease note that in order to be admitted to the defense, you must submit the explanatory note and the results of the software implementation (for engineering specialties) to your supervisor on time. Students who do not upload their papers on time will not be admitted to the main examination session. If you have any technical questions or need to clarify the schedule, please contact the responsible methodologists at the department or the dean's office during working hours."},
            "category": "for_students",
            "date": "2024-05-05",
            "image_url": "https://plus.unsplash.com/premium_photo-1706559780094-648dbe2b2bd0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
                "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
                "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80"
            ],
            "reading_time": 2,
            "tags": [{"ua": "студентам", "en": "for students"}, {"ua": "курсова робота", "en": "term paper"}, {"ua": "дедлайни", "en": "deadlines"}, {"ua": "навчання", "en": "studies"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Вступна кампанія 2024: Кафедра запрошує абітурієнтів на навчання", "en": "Admissions Campaign 2024: Department Invites Applicants to Study"},
            "content": {"ua": "Оголошується початок прийому документів на навчання за затребуваними ІТ-спеціальностями! Наша кафедра проводить підготовку бакалаврів за напрямами 121 «Інженерія програмного забезпечення» та 122 «Комп'ютерні науки».\n\nЦього року орієнтовний прохідний бал на бюджетну форму навчання становить 165 балів. Вступники отримають можливість навчатися у сучасних лабораторіях, брати участь у міжнародних програмах обміну та проходити практику у провідних IT-компаніях. Детальний перелік необхідних документів, графік роботи приймальної комісії та програму фахових іспитів ви знайдете у розділі «Абітурієнту» на нашому сайті. Зроби свій крок у цифрове майбутнє разом з нами!", "en": "The document submission process for in-demand IT specialties is now open! Our department trains bachelors in the fields of 121 'Software Engineering' and 122 'Computer Science'.\n\nThis year, the estimated passing score for state-funded study is 165 points. Applicants will have the opportunity to study in modern laboratories, participate in international exchange programs, and complete internships at leading IT companies. A detailed list of required documents, the admissions committee schedule, and the professional examination program can be found in the 'For Applicants' section on our website. Take your step into the digital future with us!"},
            "category": "for_applicants",
            "date": "2024-04-28",
            "image_url": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80",
                "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80",
                "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80",
                "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80"
            ],
            "reading_time": 2,
            "tags": [{"ua": "абітурієнту", "en": "for applicants"}, {"ua": "вступ 2024", "en": "admission 2024"}, {"ua": "спеціальність 121", "en": "specialty 121"}, {"ua": "спеціальність 122", "en": "specialty 122"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Міжнародна співпраця: Делегація кафедри на науковій конференції у Варшаві", "en": "International Cooperation: Department Delegation at a Scientific Conference in Warsaw"},
            "content": {"ua": "Представники професорсько-викладацького складу нашої кафедри взяли участь у престижній міжнародній конференції, присвяченій розвитку інформаційних технологій, що проходила у Варшаві. Під час заходу було презентовано доповіді щодо інноваційних методів розробки ПЗ та кібербезпеки.\n\nКлючовим результатом візиту стало підписання протоколу про наміри щодо наукового та академічного співробітництва з європейськими партнерами. Це відкриває широкі перспективи для запуску спільних дослідницьких проектів, програм академічної мобільності Erasmus+ для студентів 121 та 122 спеціальностей, а також проведення спільних вебінарів та літніх шкіл. Зміцнення міжнародних зв'язків залишається пріоритетом для розвитку нашої наукової школи.", "en": "Representatives of the faculty of our department took part in a prestigious international conference dedicated to the development of information technologies, held in Warsaw. During the event, presentations were made on innovative software development methods and cybersecurity.\n\nThe key result of the visit was the signing of a letter of intent regarding scientific and academic cooperation with European partners. This opens broad prospects for launching joint research projects, Erasmus+ academic mobility programs for students of specialties 121 and 122, as well as holding joint webinars and summer schools. Strengthening international ties remains a priority for the development of our academic school."},
            "category": "international_cooperation",
            "date": "2024-04-20",
            "image_url": "https://images.unsplash.com/photo-1607078486875-a697a8a38e87?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
                "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
                "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=800&q=80",
                "https://images.unsplash.com/photo-1520333789090-1afc82db536a?w=800&q=80"
            ],
            "reading_time": 3,
            "tags": [{"ua": "міжнародна співпраця", "en": "international cooperation"}, {"ua": "конференція", "en": "conference"}, {"ua": "Варшава", "en": "Warsaw"}, {"ua": "наука", "en": "science"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Erasmus+ у дії: Наші студенти вирушають на навчання до провідних університетів Європи", "en": "Erasmus+ in Action: Our Students Head to Study at Leading European Universities"},
            "content": {"ua": "Програма академічної мобільності Erasmus+ відкриває нові можливості для професійного зростання! Цього семестру п'ятеро кращих студентів нашої кафедри успішно пройшли конкурсний відбір та отримали гранти на навчання в партнерських університетах Німеччини, Польщі та Іспанії.\n\nВідбір був надзвичайно ретельним і проходив у кілька етапів, включаючи оцінку академічної успішності, знання іноземної мови та мотиваційне інтерв'ю. Кафедра активно розвиває програми обміну, щоб кожен студент мав шанс отримати унікальний міжнародний досвід, опанувати новітні технології розробки ПЗ та познайомитися з культурою інших країн. Бажаємо нашим студентам натхнення та успішного семестру в Європі!", "en": "The Erasmus+ academic mobility program opens new opportunities for professional growth! This semester, five of the best students from our department successfully passed the competitive selection and received grants to study at partner universities in Germany, Poland, and Spain.\n\nThe selection process was extremely thorough and took place in several stages, including an assessment of academic performance, foreign language proficiency, and a motivational interview. The department is actively developing exchange programs so that every student has the chance to gain a unique international experience, master the latest software development technologies, and get acquainted with the cultures of other countries. We wish our students inspiration and a successful semester in Europe!"},
            "category": "academic_mobility",
            "date": "2024-04-15",
            "image_url": "https://images.unsplash.com/photo-1734607528465-679eae41978b?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
                "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80"
            ],
            "reading_time": 2,
            "tags": [{"ua": "Erasmus+", "en": "Erasmus+"}, {"ua": "академічна мобільність", "en": "academic mobility"}, {"ua": "студенти", "en": "students"}, {"ua": "навчання за кордоном", "en": "studying abroad"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Громадське обговорення: Формуємо майбутнє освітніх програм разом", "en": "Public Discussion: Shaping the Future of Educational Programs Together"},
            "content": {"ua": "Кафедра ініціює проведення громадського обговорення проектів навчальних планів на наступний навчальний рік. Наша мета — модернізувати зміст дисциплін для спеціальностей 121 «Інженерія програмного забезпечення» та 122 «Комп'ютерні науки», щоб вони максимально відповідали сучасним запитам IT-індустрії.\n\nДо участі запрошуються студенти, випускники, представники роботодавців та всі зацікавлені сторони. Ваші пропозиції щодо включення нових вибіркових компонентів, посилення практичної складової або вивчення конкретних технологій (таких як FastAPI, React чи MLOps) будуть детально опрацьовані робочою групою. Спільна робота дозволить зробити наші освітні програми ще більш конкурентоспроможними та актуальними. Ваша думка має значення для якісної освіти!", "en": "The department is initiating a public discussion of curriculum drafts for the next academic year. Our goal is to modernize the content of disciplines for specialties 121 'Software Engineering' and 122 'Computer Science' so that they best meet the current demands of the IT industry.\n\nStudents, graduates, employer representatives, and all interested parties are invited to participate. Your suggestions regarding the inclusion of new elective components, strengthening the practical element, or studying specific technologies (such as FastAPI, React, or MLOps) will be thoroughly reviewed by the working group. Working together will allow us to make our educational programs even more competitive and relevant. Your opinion matters for quality education!"},
            "category": "public_discussion",
            "date": "2024-04-10",
            "image_url": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80",
            "content_image": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80",
            "gallery_images": [
                "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
                "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80",
                "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80",
                "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80"
            ],
            "reading_time": 2,
            "tags": [{"ua": "навчальний план", "en": "curriculum"}, {"ua": "громадське обговорення", "en": "public discussion"}, {"ua": "освіта", "en": "education"}, {"ua": "стейкхолдери", "en": "stakeholders"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "День відкритих дверей: Відкрий своє майбутнє в ІТ разом із нашою кафедрою", "en": "Open House Day: Discover Your Future in IT with Our Department"},
            "content": {"ua": "Запрошуємо абітурієнтів та їхніх батьків на День відкритих дверей! Це унікальна нагода зазирнути за лаштунки навчального процесу, поспілкуватися з викладачами та дізнатися про всі переваги навчання на спеціальностях 121 та 122.\n\nПрограма заходу:\n10:00 — Урочисте відкриття та презентація кафедри від завідувача.\n11:00 — Екскурсія навчальними лабораторіями (веб-технологій, графіки та кібербезпеки).\n12:00 — Майстер-класи від студентів старших курсів: від першого рядка коду до готового макета.\n13:00 — Q&A сесія: відповіді на запитання щодо вступу, гуртожитків та працевлаштування.\n\nРеєстрація вже відкрита на нашому сайті! Приходьте, щоб відчути атмосферу нашої спільноти та обрати свій шлях у світі високих технологій.", "en": "We invite applicants and their parents to our Open House Day! This is a unique opportunity to get a behind-the-scenes look at the educational process, talk with faculty, and learn about all the benefits of studying in specialties 121 and 122.\n\nEvent program:\n10:00 — Official opening and department presentation by the head of department.\n11:00 — Tour of the teaching laboratories (web technologies, computer graphics, and cybersecurity).\n12:00 — Workshops from senior students: from the first line of code to a finished mockup.\n13:00 — Q&A session: answers to questions about admissions, dormitories, and employment.\n\nRegistration is already open on our website! Come and feel the atmosphere of our community and choose your path in the world of high technology."},
            "category": "events",
            "date": "2024-04-05",
            "image_url": "https://images.unsplash.com/photo-1745847800340-24e5aa5c28ff?q=80&w=1229&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80",
                "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80",
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
                "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&q=80"
            ],
            "reading_time": 2,
            "tags": [{"ua": "подія", "en": "event"}, {"ua": "абітурієнту", "en": "for applicants"}, {"ua": "день відкритих дверей", "en": "open house day"}, {"ua": "вступ", "en": "admission"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Кращий випускник 2024: Церемонія нагородження відмінників кафедри", "en": "Best Graduate 2024: Award Ceremony for the Department's Top Students"},
            "content": {"ua": "Щороку наша кафедра відзначає найкращих випускників, які досягли видатних результатів у навчанні, науковій діяльності та громадському житті університету. Цього року почесне звання 'Кращий випускник кафедри' здобули троє студентів спеціальностей 121 та 122, які захистили дипломні роботи на відмінно та мають публікації у фахових виданнях.\n\nУрочиста церемонія нагородження відбулася в актовій залі університету за участю керівництва факультету, викладачів та запрошених роботодавців-партнерів. Переможці отримали дипломи з відзнакою, цінні подарунки від спонсорів та рекомендаційні листи для працевлаштування. Вітаємо наших відмінників і бажаємо їм яскравої кар'єри у світі IT!", "en": "Every year our department recognizes the best graduates who have achieved outstanding results in academics, research, and university community life. This year, the honorary title of 'Best Graduate of the Department' was awarded to three students from specialties 121 and 122, who defended their theses with distinction and have publications in professional journals.\n\nThe solemn award ceremony was held in the university's assembly hall with the participation of faculty leadership, lecturers, and invited employer partners. The winners received diplomas with honors, valuable gifts from sponsors, and letters of recommendation for employment. We congratulate our top students and wish them a bright career in the world of IT!"},
            "category": "achievements",
            "date": "2024-03-27",
            "image_url": "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&q=80",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&q=80",
                "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80",
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80"
            ],
            "reading_time": 3,
            "tags": [{"ua": "випускники", "en": "graduates"}, {"ua": "нагородження", "en": "awards"}, {"ua": "відмінники", "en": "top students"}, {"ua": "досягнення", "en": "achievements"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Літня школа з машинного навчання: Реєстрація відкрита!", "en": "Summer School on Machine Learning: Registration Is Open!"},
            "content": {"ua": "Кафедра КН та ІТ оголошує набір учасників на щорічну Літню школу з машинного навчання, яка відбудеться з 1 по 14 липня 2024 року на базі університету. Програма розрахована на студентів 2–4 курсів, які прагнуть поглибити знання у галузі штучного інтелекту та Data Science.\n\nУчасники освоять практичні навички роботи з бібліотеками Python (NumPy, Pandas, scikit-learn, PyTorch), побудови та навчання нейронних мереж, а також аналізу та візуалізації даних. Школу проводять досвідчені викладачі кафедри спільно із запрошеними практиками з провідних IT-компаній. Кількість місць обмежена — реєстрація доступна на офіційному сайті кафедри. Не пропустіть унікальну можливість прокачати свої навички цього літа!", "en": "The Department of CS & IT announces enrollment for the annual Summer School on Machine Learning, to be held from July 1 to 14, 2024, on the university campus. The program is designed for 2nd–4th year students who wish to deepen their knowledge in artificial intelligence and Data Science.\n\nParticipants will master practical skills in working with Python libraries (NumPy, Pandas, scikit-learn, PyTorch), building and training neural networks, as well as data analysis and visualization. The school is run by experienced department lecturers together with invited practitioners from leading IT companies. Places are limited — registration is available on the official department website. Don't miss this unique opportunity to level up your skills this summer!"},
            "category": "events",
            "date": "2024-03-17",
            "image_url": "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&q=80",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=800&q=80",
                "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
                "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
                "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80"
            ],
            "reading_time": 2,
            "tags": [{"ua": "літня школа", "en": "summer school"}, {"ua": "машинне навчання", "en": "machine learning"}, {"ua": "AI", "en": "AI"}, {"ua": "студентам", "en": "for students"}]
        },
        {
            "id": str(uuid.uuid4()),
            "title": {"ua": "Оновлення матеріально-технічної бази: Відкриття нової лабораторії штучного інтелекту", "en": "Infrastructure Upgrade: Opening of the New Artificial Intelligence Laboratory"},
            "content": {"ua": "На кафедрі КН та ІТ урочисто відкрито нову спеціалізовану лабораторію штучного інтелекту — AI Lab. Лабораторія оснащена сучасними робочими станціями з відеокартами NVIDIA RTX серії 4000, серверним обладнанням для хмарних обчислень та ліцензованим програмним забезпеченням для розробки та навчання моделей машинного навчання.\n\nСтворення AI Lab стало можливим завдяки спільному фінансуванню університету та компаній-партнерів кафедри. Нова лабораторія використовуватиметься для проведення практичних занять з дисциплін штучного інтелекту, комп'ютерного зору та обробки природньої мови, а також для виконання наукових досліджень студентами та аспірантами. Відкриття AI Lab — це важливий крок до підготовки фахівців світового рівня!", "en": "The Department of CS & IT has officially opened a new specialized Artificial Intelligence Laboratory — the AI Lab. The laboratory is equipped with modern workstations featuring NVIDIA RTX 4000 series graphics cards, server infrastructure for cloud computing, and licensed software for developing and training machine learning models.\n\nThe creation of the AI Lab was made possible through joint funding from the university and the department's partner companies. The new laboratory will be used for practical classes in artificial intelligence, computer vision, and natural language processing disciplines, as well as for conducting research by students and postgraduate researchers. The opening of the AI Lab is an important step toward training world-class specialists!"},
            "category": "general",
            "date": "2024-03-10",
            "image_url": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80",
            "content_image": "",
            "gallery_images": [
                "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800&q=80",
                "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80",
                "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=800&q=80",
                "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80"
            ],
            "reading_time": 3,
            "tags": [{"ua": "лабораторія", "en": "laboratory"}, {"ua": "штучний інтелект", "en": "artificial intelligence"}, {"ua": "інфраструктура", "en": "infrastructure"}, {"ua": "AI Lab", "en": "AI Lab"}]
        }
    ]

    dept_info = {
        "about_title": {"ua": "Про кафедру КН та ІТ", "en": "About the Department of CS & IT"},
        "about_text1": {"ua": "Кафедра комп'ютерних наук та інформаційних технологій є потужним інноваційним осередком, що готує фахівців нового покоління для цифровізації глобальної економіки. Ми забезпечуємо глибоку теоретичну підготовку, засновану на математичному моделюванні, поєднуючи її з інтенсивною практичною роботою над реальними проєктами.", "en": "The Department of Computer Science and Information Technologies is a powerful innovation hub that trains next-generation specialists for the digitalization of the global economy. We provide deep theoretical training based on mathematical modeling, combined with intensive hands-on work on real projects."},
        "about_text2": {"ua": "Завдяки стратегічному партнерству з провідними IT-компаніями, наші навчальні плани постійно оновлюються. Ми навчаємо не просто писати код, а проєктувати складні архітектури, забезпечувати кібербезпеку та впроваджувати AI-рішення. Наші випускники — Middle та Senior розробники, архітектори систем та технічні лідери в Google, Amazon, EPAM та SoftServe.", "en": "Thanks to strategic partnerships with leading IT companies, our curricula are continuously updated. We teach not just how to write code, but how to design complex architectures, ensure cybersecurity, and implement AI solutions. Our graduates are Middle and Senior developers, systems architects, and technical leaders at Google, Amazon, EPAM, and SoftServe."},
        "history_text": {"ua": "Кафедра була заснована у 1998 році групою науковців-ентузіастів, які передбачили глобальну цифрову трансформацію. Починаючи з однієї комп'ютерної лабораторії, за чверть століття ми перетворилися на один із найбільших підрозділів університету. За цей час підготовлено понад 2000 висококваліфікованих фахівців.", "en": "The department was founded in 1998 by a group of enthusiast scientists who anticipated the global digital transformation. Starting with a single computer lab, over a quarter century we have grown into one of the largest university units. During this time, over 2,000 highly qualified specialists have been trained."},
        "contacts": {
            "phone": "+380 44 123-45-67",
            "email": "kafedra@gmail.com",
            "location": {"ua": "м. Київ, вул. Університетська, 1, корп. №4, ауд. 302", "en": "Kyiv, 1 Universytetska St., Building No. 4, Room 302"},
            "hours": {"ua": "Пн–Пт: 09:00–18:00 (Обідня перерва: 13:00–14:00)", "en": "Mon–Fri: 09:00–18:00 (Lunch break: 13:00–14:00)"},
            "address": {"ua": "01000, Україна, м. Київ, Солом'янський район, вул. Університетська, 1", "en": "01000, Ukraine, Kyiv, Solomyansky district, 1 Universytetska St."}
        },
        "dept_name": {"ua": "Кафедра КН та ІТ", "en": "Dept. of CS & IT"},
        "footer_phones": ["+380 44 123-45-67", "+380 44 765-43-21"],
        "footer_emails": ["kafedra@gmail.com", "info@gmail.com"],
        "footer_address": {"ua": "01000, Україна, м. Київ,\nвул. Університетська, 1,\nкорп. А, каб. 215", "en": "01000, Ukraine, Kyiv,\n1 Universytetska St.,\nBuilding A, Room 215"},
        "footer_copyright": {"ua": "Кафедра комп'ютерних наук та інформаційних технологій", "en": "Department of Computer Science and Information Technologies"},
        "faq_items": [
            {
                "question": {"ua": "Які особливості вступу на спеціальність КН у 2026 році?", "en": "What are the admission requirements for the CS specialty in 2026?"},
                "answer": {"ua": "Вступ здійснюється за результатами НМТ. Основні предмети: математика, українська мова та предмет на вибір (рекомендуємо фізику або англійську). Також потрібен мотиваційний лист через електронний кабінет вступника.", "en": "Admission is based on the NMT results. Main subjects: mathematics, Ukrainian language, and an elective subject (we recommend physics or English). A motivation letter must also be submitted through the applicant's electronic account."}
            },
            {
                "question": {"ua": "Який перелік документів необхідний для зарахування?", "en": "What documents are required for enrollment?"},
                "answer": {"ua": "Основний пакет: заява, копія паспорта (ID-картки), оригінал атестата та додатка, сертифікат НМТ, 4 фотокартки 3×4 та медична довідка форми 086-о.", "en": "Main package: application, passport copy (ID card), original school certificate and supplement, NMT certificate, 4 photos (3x4 cm), and medical certificate (Form 086-o)."}
            },
            {
                "question": {"ua": "Як організований навчальний процес в умовах воєнного стану?", "en": "How is the educational process organized under martial law?"},
                "answer": {"ua": "Ми використовуємо змішану форму навчання. Лекції проводяться онлайн через MS Teams та Zoom. Лабораторні роботи, що потребують обладнання, можуть проходити в укриттях корпусу або дистанційно через хмарні лабораторії (AWS, Azure).", "en": "We use a blended learning format. Lectures are held online via MS Teams and Zoom. Lab sessions requiring equipment may take place in the building's shelters or remotely via cloud labs (AWS, Azure)."}
            },
            {
                "question": {"ua": "Де студенти проходять виробничу практику?", "en": "Where do students complete their practical training?"},
                "answer": {"ua": "Кафедра має понад 20 договорів з IT-компаніями. Студенти 3-4 курсів проходять практику в ролі Junior-розробників або QA-інженерів. Кращі отримують Job Offer до отримання диплома бакалавра.", "en": "The department has over 20 agreements with IT companies. 3rd and 4th year students work as junior developers or QA engineers. The best students receive job offers before receiving their bachelor's degree."}
            }
        ],
        "features": [
            {
                "icon": "ShieldCheck",
                "title": {"ua": "Міжнародна акредитація", "en": "International Accreditation"},
                "subtitle": {"ua": "Стандарт ISO/IEC", "en": "ISO/IEC Standard"},
                "text": {"ua": "Наші програми акредитовані НАЗЯВО та відповідають європейським стандартам якості IT-освіти (EQF), що дозволяє випускникам нострифікувати дипломи за кордоном.", "en": "Our programs are accredited by NAQA and comply with European IT education quality standards (EQF), allowing graduates to have their diplomas recognized abroad."}
            },
            {
                "icon": "Cpu",
                "title": {"ua": "Технологічний стек", "en": "Technology Stack"},
                "subtitle": {"ua": "Full-stack підхід", "en": "Full-stack Approach"},
                "text": {"ua": "Навчання охоплює актуальні мови (C#, Python, Rust, Go), сучасні фреймворки (FastAPI, .NET, React) та Big Data, хмарні обчислення і мікросервісну архітектуру.", "en": "Training covers current languages (C#, Python, Rust, Go), modern frameworks (FastAPI, .NET, React), and Big Data, cloud computing, and microservice architecture."}
            },
            {
                "icon": "Users",
                "title": {"ua": "Активна спільнота", "en": "Active Community"},
                "subtitle": {"ua": "600+ студентів", "en": "600+ Students"},
                "text": {"ua": "Ми — IT-хаб. Діють студентські гуртки зі спортивного програмування, кібербезпеки (CTF) та розробки ігор, де студенти створюють власні стартапи.", "en": "We are an IT hub. We have student clubs for competitive programming, cybersecurity (CTF), and game development, where students create their own startups."}
            },
            {
                "icon": "GraduationCap",
                "title": {"ua": "Кар'єрний ліфт", "en": "Career Elevator"},
                "subtitle": {"ua": "92% працевлаштування", "en": "92% Employment Rate"},
                "text": {"ua": "Через Career Center ми допомагаємо скласти резюме, проводимо пробні технічні інтерв'ю та організовуємо ярмарки вакансій виключно для наших студентів.", "en": "Through our Career Center, we help create resumes, conduct mock technical interviews, and organize job fairs exclusively for our students."}
            }
        ]
    }

    labs_data = [
        {
            "id": lab_ai,
            "name": {"ua": "Лабораторія штучного інтелекту та машинного навчання (AI & ML Lab)", "en": "Laboratory of Artificial Intelligence and Machine Learning (AI & ML Lab)"},
            "head_staff_id": p_id, "head_name": "Петренко Іван Олексійович",
            "description": {"ua": "Центр передових досліджень у галузі інтелектуальної обробки даних. Лабораторія фокусується на створенні нейромережевих моделей, оптимізації алгоритмів глибокого навчання та впровадженні AI-рішень у промислові та соціальні проєкти.", "en": "A center of advanced research in intelligent data processing. The laboratory focuses on creating neural network models, optimizing deep learning algorithms, and implementing AI solutions in industrial and social projects."},
            "created_date": {"ua": "Лабораторія заснована у 2005 році та пройшла шлях від невеликого дослідницького гуртка до провідного R&D центру факультету.", "en": "The laboratory was founded in 2005 and has grown from a small research group into the faculty's leading R&D center."},
            "research_directions": [
                {"icon": "Brain", "title": {"ua": "Глибоке навчання та LLM", "en": "Deep Learning and LLMs"}, "text": {"ua": "Розробка та тонке налаштування архітектур Transformer для NLP, кастомні нейронні мережі для прогнозування часових рядів та генеративного мистецтва.", "en": "Development and fine-tuning of Transformer architectures for NLP tasks, custom neural networks for time series forecasting and generative art."}},
                {"icon": "Eye", "title": {"ua": "Інтелектуальний комп'ютерний зір", "en": "Intelligent Computer Vision"}, "text": {"ua": "Алгоритми детекції об'єктів у реальному часі, семантична сегментація медичних знімків та системи біометричної ідентифікації.", "en": "Real-time object detection algorithms, semantic segmentation of medical images, and biometric identification systems based on face recognition."}},
                {"icon": "TrendingUp", "title": {"ua": "Прикладний Data Science", "en": "Applied Data Science"}, "text": {"ua": "Побудова предиктивних моделей для бізнес-аналітики, аналіз великих даних та рекомендаційні системи для e-commerce.", "en": "Building predictive models for business analytics, big data mining, and recommendation systems for e-commerce platforms."}}
            ],
            "team_member_ids": [p_id, l_id, m_id, kr_id],
            "education_connection": [
                {"icon": "GraduationCap", "title": {"ua": "Інноваційна освітня база", "en": "Innovative Educational Base"}, "text": {"ua": "Основний майданчик для дипломних робіт магістрів з доступом до GPU-кластерів для навчання власних моделей.", "en": "The main venue for master's thesis projects, where students have access to GPU clusters for training their own models."}},
                {"icon": "Globe", "title": {"ua": "Міжнародна колаборація", "en": "International Collaboration"}, "text": {"ua": "Участь у грантових програмах та спільні дослідження з європейськими центрами AI.", "en": "Participation in grant programs and joint research with European AI centers."}}
            ],
            "contact_location": {"ua": "Корпус №4, 3 поверх, ауд. 301", "en": "Building No. 4, Floor 3, Room 301"},
            "contact_email": "ai.lab.support@gmail.com"
        },
        {
            "id": lab_net,
            "name": {"ua": "Лабораторія комп'ютерних мереж та кібербезпеки (CyberSecurity & NetLab)", "en": "Laboratory of Computer Networks and Cybersecurity (CyberSecurity & NetLab)"},
            "head_staff_id": k_id, "head_name": "Коваленко Марія Степанівна",
            "description": {"ua": "Спеціалізований дослідницький центр з архітектури захищених систем та хмарних інфраструктур. Заснована у 2003 році, сьогодні фокусується на IDS-системах, penetration testing та відмовостійких хмарних рішеннях.", "en": "A specialized research center for secure system and cloud infrastructure architecture. Founded in 2003, today it focuses on IDS systems, penetration testing, and fault-tolerant cloud solutions."},
            "created_date": {"ua": "Лабораторія розпочала роботу у 2003 році, ставши одним із перших сертифікованих центрів підготовки мережевих адміністраторів у регіоні.", "en": "The laboratory began work in 2003, becoming one of the first certified centers for training network administrators in the region."},
            "research_directions": [
                {"icon": "Network", "title": {"ua": "Інфраструктура та SDN", "en": "Infrastructure and SDN"}, "text": {"ua": "Дослідження програмно-конфігурованих мереж (SDN), оптимізація маршрутизації та впровадження стандартів 5G/6G.", "en": "Research into software-defined networking (SDN), routing optimization, and implementation of 5G/6G standards."}},
                {"icon": "Shield", "title": {"ua": "Кіберзахист та Криптографія", "en": "Cyber Defense and Cryptography"}, "text": {"ua": "Аналіз вразливостей ПЗ, моделі Zero Trust Network Access (ZTNA) та постквантові методи шифрування.", "en": "Software vulnerability analysis, Zero Trust Network Access (ZTNA) models, and post-quantum encryption methods."}},
                {"icon": "Cloud", "title": {"ua": "Cloud-Native безпека", "en": "Cloud-Native Security"}, "text": {"ua": "Захист контейнеризованих додатків у Docker/Kubernetes та системи моніторингу безпеки в реальному часі.", "en": "Security of containerized applications in Docker/Kubernetes and real-time security monitoring systems."}}
            ],
            "team_member_ids": [k_id, o_id, i_id],
            "education_connection": [
                {"icon": "GraduationCap", "title": {"ua": "Технічна база Cisco", "en": "Cisco Technical Base"}, "text": {"ua": "Лабораторія оснащена маршрутизаторами та комутаторами Cisco корпоративного рівня для відпрацювання навичок на реальному обладнанні.", "en": "The laboratory is equipped with enterprise-grade Cisco routers and switches for hands-on practice on real hardware."}},
                {"icon": "Globe", "title": {"ua": "Сертифікаційна підготовка", "en": "Certification Preparation"}, "text": {"ua": "Програма інтегрована з Cisco Networking Academy та стандартами CompTIA Security+ для отримання міжнародних сертифікатів.", "en": "The program is integrated with Cisco Networking Academy and CompTIA Security+ standards for obtaining international certifications."}}
            ],
            "contact_location": {"ua": "Корпус №4, 2 поверх, ауд. 205", "en": "Building No. 4, Floor 2, Room 205"},
            "contact_email": "network.lab@gmail.com"
        },
        {
            "id": lab_se,
            "name": {"ua": "Лабораторія програмної інженерії та DevOps (SE & DevOps Lab)", "en": "Laboratory of Software Engineering and DevOps (SE & DevOps Lab)"},
            "head_staff_id": sh_id, "head_name": "Шевченко Олексій Петрович",
            "description": {"ua": "Провідний хаб з дослідження сучасних парадигм розробки ПЗ та автоматизації життєвого циклу систем. Заснована у 2008 році для впровадження індустріальних стандартів розробки в навчальний процес.", "en": "The leading hub for researching modern software development paradigms and system lifecycle automation. Founded in 2008 to integrate industrial development standards into the educational process."},
            "created_date": {"ua": "Лабораторія розпочала діяльність у 2008 році з метою створення містка між академічною освітою та вимогами IT-ринку.", "en": "The laboratory began in 2008 with the goal of bridging academic education and IT market demands."},
            "research_directions": [
                {"icon": "Code2", "title": {"ua": "Методології розробки та DevOps", "en": "Development Methodologies and DevOps"}, "text": {"ua": "Дослідження Agile-практик, проектування CI/CD конвеєрів та контейнеризація додатків.", "en": "Research into Agile practices, designing CI/CD pipelines, and application containerization."}},
                {"icon": "TestTube2", "title": {"ua": "Software Quality Assurance", "en": "Software Quality Assurance"}, "text": {"ua": "Стратегії автоматизованого тестування (Unit, Integration, E2E) та статичний аналіз коду за стандартами ISO/IEC.", "en": "Automated testing strategies (Unit, Integration, E2E) and static code analysis per ISO/IEC standards."}},
                {"icon": "Layers", "title": {"ua": "Архітектурне проектування", "en": "Architectural Design"}, "text": {"ua": "Мікросервісні архітектури, патерни проектування (SOLID, GRASP) та розробка масштабованих систем.", "en": "Microservice architectures, design patterns (SOLID, GRASP), and development of scalable high-load systems."}}
            ],
            "team_member_ids": [sh_id, t_id, l_id],
            "education_connection": [
                {"icon": "GraduationCap", "title": {"ua": "Індустріальні проекти", "en": "Industry Projects"}, "text": {"ua": "Курсові та дипломні проекти імітують роботу в IT-командах з Jira, Git та Agile-спринтами.", "en": "Coursework and thesis projects simulate work in real IT teams using Jira, Git, and Agile sprints."}},
                {"icon": "Globe", "title": {"ua": "Стандартизація SWEBOK", "en": "SWEBOK Standardization"}, "text": {"ua": "Навчальний процес базується на SWEBOK та стандартах ISO/IEC 12207, що гарантує конкурентність випускників.", "en": "The educational process is based on SWEBOK and ISO/IEC 12207 standards, ensuring graduate competitiveness."}}
            ],
            "contact_location": {"ua": "Корпус №4, 1 поверх, каб. 110", "en": "Building No. 4, Floor 1, Room 110"},
            "contact_email": "se.lab.support@gmail.com"
        },
        {
            "id": lab_db,
            "name": {"ua": "Лабораторія систем управління базами даних та аналітики (Data Systems & Analytics Lab)", "en": "Laboratory of Database Management Systems and Analytics (Data Systems & Analytics Lab)"},
            "head_staff_id": b_id, "head_name": "Бондаренко Наталія Вікторівна",
            "description": {"ua": "Провідний науковий осередок з проектування архітектур зберігання та обробки даних. Заснована у 2001 році, сьогодні фокусується на гібридних сховищах, Big Data технологіях та масштабуванні систем.", "en": "A leading scientific center for designing data storage and processing architectures. Founded in 2001, today it focuses on hybrid storage, Big Data technologies, and system scaling."},
            "created_date": {"ua": "Лабораторія заснована у 2001 році, ставши першим осередком кафедри, присвяченим дослідженню структур даних та алгоритмів їх обробки.", "en": "Founded in 2001, the laboratory was the first department center dedicated to research of data structures and their processing algorithms."},
            "research_directions": [
                {"icon": "Database", "title": {"ua": "Гібридні архітектури (SQL & NoSQL)", "en": "Hybrid Architectures (SQL & NoSQL)"}, "text": {"ua": "Порівняльний аналіз PostgreSQL, MongoDB та Redis. Стратегії шардингу, реплікації та оптимізації запитів для Enterprise-систем.", "en": "Comparative analysis of PostgreSQL, MongoDB, and Redis. Sharding, replication, and query optimization strategies for enterprise systems."}},
                {"icon": "BarChart2", "title": {"ua": "Big Data Engineering", "en": "Big Data Engineering"}, "text": {"ua": "Конвеєри обробки даних за допомогою Apache (Hadoop, Spark, Kafka) та методи аналітики в реальному часі.", "en": "Data processing pipelines using Apache ecosystem (Hadoop, Spark, Kafka) and real-time analytics methods."}},
                {"icon": "Cpu", "title": {"ua": "Інформаційні системи корпоративного рівня", "en": "Enterprise-level Information Systems"}, "text": {"ua": "Проектування ERP та CRM систем, складні ETL-процеси та забезпечення бізнес-аналітики (BI).", "en": "Designing ERP and CRM architectures, complex ETL processes, and enabling business intelligence (BI)."}}
            ],
            "team_member_ids": [b_id, t_id, i_id],
            "education_connection": [
                {"icon": "GraduationCap", "title": {"ua": "Практична база даних", "en": "Practical Database Base"}, "text": {"ua": "Студенти адмініструють та проектують БД на реальних серверах лабораторії з використанням сучасних CASE-засобів.", "en": "Students administer and design databases on real laboratory servers using modern CASE modeling tools."}},
                {"icon": "Globe", "title": {"ua": "Якість даних та стандарти", "en": "Data Quality and Standards"}, "text": {"ua": "Навчання базується на ISO/IEC 25012 (Модель якості даних) для опанування методів аудиту та очищення даних.", "en": "Training is based on ISO/IEC 25012 (Data Quality Model) for mastering data audit and cleansing methods."}}
            ],
            "contact_location": {"ua": "Корпус №4, 2 поверх, ауд. 215", "en": "Building No. 4, Floor 2, Room 215"},
            "contact_email": "data.lab@gmail.com"
        },
        {
            "id": lab_web,
            "name": {"ua": "Лабораторія сучасних веб-технологій та дизайну (WebTech Lab)", "en": "Laboratory of Modern Web Technologies and Design (WebTech Lab)"},
            "head_staff_id": t_id, "head_name": "Ткаченко Сергій Михайлович",
            "description": {"ua": "Креативний та технічний простір для розробки веб-рішень та мобільних екосистем. Відкрита у 2010 році, фокусується на швидких, безпечних та доступних інтерфейсах та хмарній інтеграції.", "en": "A creative and technical space for developing web solutions and mobile ecosystems. Opened in 2010, it focuses on fast, secure, and accessible interfaces and cloud integration."},
            "created_date": {"ua": "Лабораторія заснована у 2010 році, ставши головним центром підготовки Full-stack розробників та UI/UX дизайнерів факультету.", "en": "Founded in 2010, the laboratory became the main center for training full-stack developers and UI/UX designers at the faculty."},
            "research_directions": [
                {"icon": "Globe", "title": {"ua": "Modern Full-stack Development", "en": "Modern Full-stack Development"}, "text": {"ua": "Реактивні фреймворки (React, Next.js, Vue.js), масштабовані API на FastAPI/Node.js та SSR для SEO-оптимізації.", "en": "Reactive frameworks (React, Next.js, Vue.js), scalable APIs with FastAPI/Node.js, and SSR for SEO optimization."}},
                {"icon": "Smartphone", "title": {"ua": "Cross-platform Mobile Solutions", "en": "Cross-platform Mobile Solutions"}, "text": {"ua": "Гібридні мобільні застосунки (React Native, Flutter) та прогресивні веб-додатки (PWA) з офлайн-режимом.", "en": "Hybrid mobile applications (React Native, Flutter) and Progressive Web Apps (PWA) with offline mode."}},
                {"icon": "Layout", "title": {"ua": "UI/UX та доступність", "en": "UI/UX and Accessibility"}, "text": {"ua": "UX-дослідження, проєктування інтерфейсів у Figma та відповідність стандартам інклюзивності WCAG 2.1.", "en": "UX research, interface design in Figma, and compliance with WCAG 2.1 accessibility standards."}}
            ],
            "team_member_ids": [t_id, kr_id, l_id],
            "education_connection": [
                {"icon": "GraduationCap", "title": {"ua": "Практикум з сучасних фреймворків", "en": "Modern Frameworks Workshop"}, "text": {"ua": "Студенти опановують актуальний стек, працюючи над реальними кейсами: від лендінгів до складних CRM-систем.", "en": "Students master the current technology stack by working on real cases: from landing pages to complex CRM systems."}},
                {"icon": "Globe", "title": {"ua": "Відкриті веб-стандарти", "en": "Open Web Standards"}, "text": {"ua": "Навчання базується на специфікаціях W3C та WHATWG для розуміння фундаментальних принципів роботи браузерів.", "en": "Training is based on W3C and WHATWG specifications for understanding fundamental browser and DOM principles."}}
            ],
            "contact_location": {"ua": "Корпус №4, 2 поверх, ауд. 210 (Web-студія)", "en": "Building No. 4, Floor 2, Room 210 (Web Studio)"},
            "contact_email": "webtech.lab@gmail.com"
        },
        {
            "id": lab_cg,
            "name": {"ua": "Лабораторія комп'ютерної графіки, AR/VR та UX-досліджень (Visual Systems Lab)", "en": "Laboratory of Computer Graphics, AR/VR and UX Research (Visual Systems Lab)"},
            "head_staff_id": kr_id, "head_name": "Кравченко Юлія Олексіївна",
            "description": {"ua": "Інноваційний простір для дослідження систем комп'ютерного зору та іммерсивних технологій. Заснована у 2012 році, оснащена VR/AR гарнітурами, планшетами для цифрового скульптингу та ПЗ для 3D-моделювання.", "en": "An innovative space for researching computer vision systems and immersive technologies. Founded in 2012, equipped with VR/AR headsets, digital sculpting tablets, and 3D modeling software."},
            "created_date": {"ua": "Лабораторія відкрита у 2012 році, ставши першим осередком кафедри в галузі цифрового мистецтва та іммерсивних технологій.", "en": "Opened in 2012, the laboratory was the first department center in the field of digital art and immersive technologies."},
            "research_directions": [
                {"icon": "Monitor", "title": {"ua": "Реалістична 3D-графіка та рушії", "en": "Realistic 3D Graphics and Engines"}, "text": {"ua": "Алгоритми рендерингу в реальному часі (Ray Tracing), розробка шейдерів та оптимізація графічних конвеєрів для Unreal Engine та Unity.", "en": "Real-time rendering algorithms (Ray Tracing), shader development, and graphics pipeline optimization for Unreal Engine and Unity."}},
                {"icon": "Smartphone", "title": {"ua": "Іммерсивні AR/VR технології", "en": "Immersive AR/VR Technologies"}, "text": {"ua": "Застосунки доповненої (ARCore/ARKit) та віртуальної реальності (OpenXR, SteamVR) та оптимізація для VR-пристроїв.", "en": "Augmented (ARCore/ARKit) and virtual reality (OpenXR, SteamVR) applications and performance optimization for VR devices."}},
                {"icon": "Layout", "title": {"ua": "Human-Computer Interaction та UX-аудит", "en": "Human-Computer Interaction and UX Audit"}, "text": {"ua": "Юзабіліті-тести, аналіз теплових карт (Eye-tracking) та розробка інклюзивних інтерфейсів.", "en": "Usability tests, interaction heatmap analysis (Eye-tracking), and inclusive interface development."}}
            ],
            "team_member_ids": [kr_id, m_id, sh_id],
            "education_connection": [
                {"icon": "GraduationCap", "title": {"ua": "Творча лабораторія студентів", "en": "Student Creative Lab"}, "text": {"ua": "Студенти мають доступ до Autodesk Maya, ZBrush, Substance Painter для реалізації дипломних проектів у сфері цифрових медіа.", "en": "Students have access to Autodesk Maya, ZBrush, Substance Painter for thesis projects in digital media."}},
                {"icon": "Globe", "title": {"ua": "Зв'язок з ігровою індустрією", "en": "Connection to Game Industry"}, "text": {"ua": "Зв'язки з українськими ігровими студіями для практики та демонстрації робіт на галузевих виставках.", "en": "Connections with Ukrainian game studios for internships and showcasing work at industry exhibitions."}}
            ],
            "contact_location": {"ua": "Корпус №4, 3 поверх, ауд. 315 (Студія комп'ютерної графіки)", "en": "Building No. 4, Floor 3, Room 315 (Computer Graphics Studio)"},
            "contact_email": "visual.lab@gmail.com"
        },
    ]

    proj_data = [
        {
            "id": str(uuid.uuid4()), "lab_id": lab_ai,
            "name": {"ua": "Інтелектуальна система діагностики патологій за медичними зображеннями", "en": "Intelligent Medical Image Pathology Diagnostics System"},
            "description": {"ua": "Проєкт зі створення гібридної нейромережевої архітектури (CNN + Vision Transformer) для автоматизованого аналізу рентгенівських знімків та МРТ. Система здатна виявляти аномалії на ранніх стадіях з точністю 97.4%. Реалізується у партнерстві з обласним діагностичним центром на верифікованому датасеті з понад 50 000 клінічних випадків.", "en": "A project to create a hybrid neural network architecture (CNN + Vision Transformer) for automated analysis of X-rays and MRI scans. The system detects anomalies at early stages with 97.4% accuracy, developed in partnership with a regional diagnostic center using a verified dataset of over 50,000 clinical cases."},
            "image_url": "https://images.unsplash.com/photo-1666214280250-41f16ba24a26?q=80&w=1170&auto=format&fit=crop",
            "coordinator_ids": [p_id, l_id],
            "coordinator_names": ["Петренко Іван Олексійович", "Лисенко Андрій Юрійович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_ai,
            "name": {"ua": "Система семантичного реферування та аналізу наукових трендів (Sci-NLP)", "en": "Semantic Abstracting and Scientific Trend Analysis System (Sci-NLP)"},
            "description": {"ua": "Розробка інструменту на базі архітектури BERT для автоматичної генерації анотацій та виявлення зв'язків у великих масивах наукових текстів. Система інтегрована з базами Scopus та Web of Science для відстеження трендів у реальному часі.", "en": "Development of a BERT-based tool for automatic abstract generation and discovering connections in large scientific text datasets. The system integrates with Scopus and Web of Science databases for real-time trend monitoring."},
            "image_url": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80",
            "coordinator_ids": [p_id, m_id],
            "coordinator_names": ["Петренко Іван Олексійович", "Мельник Оксана Іванівна"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_ai,
            "name": {"ua": "Платформа федеративного навчання для децентралізованих систем (FedLearn)", "en": "Federated Learning Platform for Decentralized Systems (FedLearn)"},
            "description": {"ua": "Інноваційна платформа конфіденційного машинного навчання. Дозволяє тренувати спільні ML-моделі на розподілених даних без їх передачі на центральний сервер, що гарантує 100% приватність. Реалізується у міжнародному консорціумі з двома європейськими університетами.", "en": "An innovative privacy-preserving machine learning platform. Enables training shared ML models on distributed data without transmitting it to a central server, guaranteeing 100% privacy. Developed within an international consortium with two European universities."},
            "image_url": "https://plus.unsplash.com/premium_photo-1764687666263-bf9e3ab9ce2b?q=80&w=1332&auto=format&fit=crop",
            "coordinator_ids": [l_id, kr_id],
            "coordinator_names": ["Лисенко Андрій Юрійович", "Кравченко Юлія Олексіївна"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_net,
            "name": {"ua": "Інтелектуальна система виявлення та запобігання вторгненням (Next-Gen IDS/IPS)", "en": "Intelligent Intrusion Detection and Prevention System (Next-Gen IDS/IPS)"},
            "description": {"ua": "Розробка адаптивної системи моніторингу мережевого трафіку з методами ML для виявлення аномалій та Zero-day атак. Система автоматично блокує загрози в реальному часі. Пілотне тестування успішно проведено в 5 організаціях.", "en": "Development of an adaptive network traffic monitoring system using ML for anomaly and zero-day attack detection. The system automatically blocks threats in real time. Pilot testing was successfully completed at 5 organizations."},
            "image_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
            "coordinator_ids": [k_id, o_id],
            "coordinator_names": ["Коваленко Марія Степанівна", "Олійник Тетяна Василівна"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_net,
            "name": {"ua": "Дослідження та моделювання протоколів зв'язку нового покоління 5G/6G", "en": "Research and Modeling of Next-Generation 5G/6G Communication Protocols"},
            "description": {"ua": "Проєкт з оптимізації архітектур SDN для наднизької затримки сигналу та аналізу пропускної здатності міліметрових хвиль. Реалізується за технічної підтримки інженерів Ericsson.", "en": "A project optimizing SDN architectures for ultra-low signal latency and analyzing millimeter wave throughput. Developed with technical support from Ericsson engineers."},
            "image_url": "https://images.unsplash.com/photo-1562408590-e32931084e23?w=800&q=80",
            "coordinator_ids": [k_id, i_id],
            "coordinator_names": ["Коваленко Марія Степанівна", "Іванов Дмитро Сергійович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_se,
            "name": {"ua": "Хмарна платформа автоматизованого тестування студентських робіт (EduCheck Cloud)", "en": "Cloud Platform for Automated Student Work Assessment (EduCheck Cloud)"},
            "description": {"ua": "Масштабована SaaS-екосистема для автоматичної перевірки коду студентів з GitHub Actions та Docker. Архітектура на Serverless дозволяє обробляти тисячі запитів одночасно з миттєвим зворотним зв'язком.", "en": "A scalable SaaS ecosystem for automatic student code checking using GitHub Actions and Docker. The Serverless architecture handles thousands of concurrent requests with instant feedback."},
            "image_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
            "coordinator_ids": [sh_id, t_id],
            "coordinator_names": ["Шевченко Олексій Петрович", "Ткаченко Сергій Михайлович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_se,
            "name": {"ua": "Система автоматизованого моніторингу стабільності мікросервісів (SRE-Pulse)", "en": "Automated Microservice Stability Monitoring System (SRE-Pulse)"},
            "description": {"ua": "Впровадження практик Chaos Engineering для тестування стійкості мікросервісних архітектур. Система автоматично імітує відмови вузлів та аналізує швидкість відновлення сервісів до виходу в продуктивне середовище.", "en": "Implementation of Chaos Engineering practices for testing microservice architecture resilience. The system automatically simulates node failures and analyzes service recovery time before production deployment."},
            "image_url": "https://images.unsplash.com/photo-1551288049-bbda48658a7d?w=1200&q=80",
            "coordinator_ids": [sh_id, l_id],
            "coordinator_names": ["Шевченко Олексій Петрович", "Лисенко Андрій Юрійович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_se,
            "name": {"ua": "Платформа оркестрації гібридних хмарних середовищ (CloudWeaver)", "en": "Hybrid Cloud Orchestration Platform (CloudWeaver)"},
            "description": {"ua": "Розробка абстракцій Infrastructure as Code (IaC) для безшовного розгортання між AWS, Azure та локальними серверами. Платформа автоматично оптимізує витрати, переміщуючи навантаження в реальному часі.", "en": "Development of IaC abstractions for seamless deployment across AWS, Azure, and on-premises servers. The platform automatically optimizes costs by moving workloads in real time based on pricing."},
            "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
            "coordinator_ids": [sh_id, t_id],
            "coordinator_names": ["Шевченко Олексій Петрович", "Ткаченко Сергій Михайлович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_db,
            "name": {"ua": "Аналітична платформа Big Data для охорони здоров'я (HealthData Analytics)", "en": "Big Data Analytics Platform for Healthcare (HealthData Analytics)"},
            "description": {"ua": "Система для обробки деперсоналізованих медичних записів за допомогою Apache Spark та Kafka. Дозволяє прогнозувати епідеміологічні спалахи та оптимізувати розподіл медичних ресурсів. Консультується з представниками МОЗ України.", "en": "A system for processing anonymized medical records using Apache Spark and Kafka. Enables forecasting epidemiological outbreaks and optimizing medical resource distribution, in consultation with the Ministry of Health of Ukraine."},
            "image_url": "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80",
            "coordinator_ids": [b_id, i_id],
            "coordinator_names": ["Бондаренко Наталія Вікторівна", "Іванов Дмитро Сергійович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_db,
            "name": {"ua": "Система інтелектуальної оптимізації запитів для СУБД (SmartIndexer AI)", "en": "Intelligent Query Optimization System for DBMS (SmartIndexer AI)"},
            "description": {"ua": "Інтелектуальний шар над PostgreSQL та MSSQL, що використовує ML для автоматичного створення оптимальних індексів без зупинки сервісу. Скорочує час відгуку на 40–60%.", "en": "An intelligent layer over PostgreSQL and MSSQL that uses ML to automatically create optimal indexes without service interruption, reducing response time by 40–60%."},
            "image_url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=1200&q=80",
            "coordinator_ids": [b_id, t_id],
            "coordinator_names": ["Бондаренко Наталія Вікторівна", "Ткаченко Сергій Михайлович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_db,
            "name": {"ua": "Платформа моніторингу логістичних ланцюгів у реальному часі (StreamLog)", "en": "Real-time Logistics Chain Monitoring Platform (StreamLog)"},
            "description": {"ua": "Обробка потокових даних з тисяч IoT-сенсорів за допомогою Apache Kafka та Flink. Дозволяє будувати динамічні графіки поставок та прогнозувати затримки на основі історичних даних.", "en": "Processing streaming data from thousands of IoT sensors using Apache Kafka and Flink. Enables building dynamic supply graphs and forecasting delays based on historical data."},
            "image_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80",
            "coordinator_ids": [i_id, b_id],
            "coordinator_names": ["Іванов Дмитро Сергійович", "Бондаренко Наталія Вікторівна"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_web,
            "name": {"ua": "Єдина інтегрована освітня платформа (UniStream LMS)", "en": "Unified Integrated Educational Platform (UniStream LMS)"},
            "description": {"ua": "Хмарна SaaS-платформа для управління навчальними процесами. Підтримує потокове відео, інтерактивні модулі перевірки знань та автоматизовану звітність. Побудована на Next.js + FastAPI з відповідністю стандартам WCAG.", "en": "A cloud SaaS platform for learning management. Supports video streaming, interactive knowledge assessment modules, and automated reporting. Built on Next.js + FastAPI with WCAG accessibility compliance."},
            "image_url": "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80",
            "coordinator_ids": [t_id, kr_id],
            "coordinator_names": ["Ткаченко Сергій Михайлович", "Кравченко Юлія Олексіївна"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_web,
            "name": {"ua": "Платформа мікросервісних фронтендів для Enterprise-систем (M-Front)", "en": "Micro-frontend Platform for Enterprise Systems (M-Front)"},
            "description": {"ua": "Дослідження та впровадження Micro-frontends архітектури. Дозволяє незалежним командам розробляти частини застосунку у різних технологіях (React/Vue/Angular) у межах єдиного UX.", "en": "Research and implementation of Micro-frontends architecture. Allows independent teams to develop application parts in different technologies (React/Vue/Angular) within a single seamless UX."},
            "image_url": "https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&q=80",
            "coordinator_ids": [t_id, sh_id],
            "coordinator_names": ["Ткаченко Сергій Михайлович", "Шевченко Олексій Петрович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_web,
            "name": {"ua": "Кросплатформенна екосистема для міського туризму (SmartCity Guide)", "en": "Cross-platform Urban Tourism Ecosystem (SmartCity Guide)"},
            "description": {"ua": "PWA на React Native та FastAPI з інтерактивними маршрутами та офлайн-режимом. Включає модуль доповненої реальності для веб-браузерів (WebAR).", "en": "PWA built on React Native and FastAPI with interactive routes and offline mode. Includes a web augmented reality module (WebAR) for browsers."},
            "image_url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80",
            "coordinator_ids": [t_id, kr_id],
            "coordinator_names": ["Ткаченко Сергій Михайлович", "Кравченко Юлія Олексіївна"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_cg,
            "name": {"ua": "Іммерсивний VR-симулятор віртуальної хімічної лабораторії", "en": "Immersive VR Simulator of a Virtual Chemistry Laboratory"},
            "description": {"ua": "Висококреалістичне VR-середовище для безпечного проведення хімічних дослідів. Включає точну 3D-візуалізацію молекулярних реакцій та фізично-коректну модель взаємодії з реактивами. Підтримано грантом НАН України.", "en": "A highly realistic VR environment for safely conducting chemical experiments. Includes precise 3D visualization of molecular reactions and a physically accurate reagent interaction model. Supported by an NAS of Ukraine grant."},
            "image_url": "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=800&q=80",
            "coordinator_ids": [kr_id, m_id],
            "coordinator_names": ["Кравченко Юлія Олексіївна", "Мельник Оксана Іванівна"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_cg,
            "name": {"ua": "Система процедурної генерації фотореалістичних ландшафтів (TerraGen AI)", "en": "Procedural Photorealistic Landscape Generation System (TerraGen AI)"},
            "description": {"ua": "Інструментарій на базі Unreal Engine 5 для процедурної генерації відкритих світів з використанням шумів Перліна та нейронних мереж для топографії, рослинності та погодних ефектів.", "en": "Tooling based on Unreal Engine 5 for procedural generation of open worlds using Perlin noise and neural networks for topography, vegetation, and weather effects."},
            "image_url": "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=1200&q=80",
            "coordinator_ids": [kr_id, sh_id],
            "coordinator_names": ["Кравченко Юлія Олексіївна", "Шевченко Олексій Петрович"]
        },
        {
            "id": str(uuid.uuid4()), "lab_id": lab_cg,
            "name": {"ua": "Мобільний застосунок з AR-візуалізацією архітектурних об'єктів (ArchiView)", "en": "Mobile Application with AR Visualization of Architectural Objects (ArchiView)"},
            "description": {"ua": "Інструмент доповненої реальності для візуалізації майбутніх будівель на місці забудови за допомогою ARCore та ARKit. Дозволяє переглядати 3D-моделі у реальному масштабі.", "en": "An augmented reality tool for visualizing future buildings on construction sites using ARCore and ARKit, allowing 3D model viewing at real scale."},
            "image_url": "https://images.unsplash.com/photo-1633113088452-959718214789?w=1200&q=80",
            "coordinator_ids": [kr_id, t_id],
            "coordinator_names": ["Кравченко Юлія Олексіївна", "Ткаченко Сергій Михайлович"]
        },
    ]

    await db.staff.insert_many(staff_data)
    await db.news.insert_many(news_data)
    await db.specialties.insert_many(specialties_data)
    await db.department_info.insert_one(dept_info)
    await db.laboratories.insert_many(labs_data)
    await db.lab_projects.insert_many(proj_data)

    # ══ GROUPS SEED ══
    await db.study_groups.delete_many({})

    kn11_id = str(uuid.uuid4()); kn12_id = str(uuid.uuid4()); kn13_id = str(uuid.uuid4())
    kn21_id = str(uuid.uuid4()); kn22_id = str(uuid.uuid4()); kn23_id = str(uuid.uuid4())
    kn31_id = str(uuid.uuid4()); kn32_id = str(uuid.uuid4()); kn33_id = str(uuid.uuid4())
    kn41_id = str(uuid.uuid4()); kn42_id = str(uuid.uuid4()); kn43_id = str(uuid.uuid4())

    groups_seed = [
        {"id": kn11_id, "name": "КН-11", "course": 1, "semester": 2, "speciality_code": "122", "curator_staff_id": m_id, "curator_name": {"ua": "Мельник Оксана Іванівна", "en": "Melnyk Oksana Ivanivna"}},
        {"id": kn12_id, "name": "КН-12", "course": 1, "semester": 2, "speciality_code": "122", "curator_staff_id": l_id, "curator_name": {"ua": "Лисенко Андрій Юрійович", "en": "Lysenko Andriy Yuriiovych"}},
        {"id": kn13_id, "name": "КН-13", "course": 1, "semester": 2, "speciality_code": "122", "curator_staff_id": kr_id, "curator_name": {"ua": "Кравченко Юлія Олексіївна", "en": "Kravchenko Yuliya Oleksiyivna"}},
        {"id": kn21_id, "name": "КН-21", "course": 2, "semester": 3, "speciality_code": "122", "curator_staff_id": t_id, "curator_name": {"ua": "Ткаченко Сергій Михайлович", "en": "Tkachenko Serhiy Mykhaylovych"}},
        {"id": kn22_id, "name": "КН-22", "course": 2, "semester": 3, "speciality_code": "122", "curator_staff_id": b_id, "curator_name": {"ua": "Бондаренко Наталія Вікторівна", "en": "Bondarenko Nataliya Viktorivna"}},
        {"id": kn23_id, "name": "КН-23", "course": 2, "semester": 3, "speciality_code": "122", "curator_staff_id": i_id, "curator_name": {"ua": "Іванов Дмитро Сергійович", "en": "Ivanov Dmytro Serhiyovych"}},
        {"id": kn31_id, "name": "КН-31", "course": 3, "semester": 5, "speciality_code": "122", "curator_staff_id": sh_id, "curator_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
        {"id": kn32_id, "name": "КН-32", "course": 3, "semester": 5, "speciality_code": "122", "curator_staff_id": o_id, "curator_name": {"ua": "Олійник Тетяна Василівна", "en": "Oliynik Tetyana Vasylivna"}},
        {"id": kn33_id, "name": "КН-33", "course": 3, "semester": 5, "speciality_code": "122", "curator_staff_id": pl_id, "curator_name": {"ua": "Поліщук Василь Миколайович", "en": "Polishchuk Vasyl Mykolayovych"}},
        {"id": kn41_id, "name": "КН-41", "course": 4, "semester": 7, "speciality_code": "122", "curator_staff_id": k_id, "curator_name": {"ua": "Коваленко Марія Степанівна", "en": "Kovalenko Maria Stepanivna"}},
        {"id": kn42_id, "name": "КН-42", "course": 4, "semester": 7, "speciality_code": "122", "curator_staff_id": p_id, "curator_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
        {"id": kn43_id, "name": "КН-43", "course": 4, "semester": 7, "speciality_code": "122", "curator_staff_id": s_id, "curator_name": {"ua": "Ситник Лариса Олексіївна", "en": "Sitnik Larysa Oleksiyivna"}},
    ]
    await db.study_groups.insert_many(groups_seed)
    # ══ EXAM SCHEDULES SEED ══
    await db.exam_schedules.delete_many({})

    exam_schedules_seed = [
        # КН-11
        {"group_id": kn11_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Основи програмування", "en": "Fundamentals of Programming"}, "consultation_date": "2026-06-10", "consultation_time": "14:00", "exam_date": "2026-06-12", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Дискретна математика", "en": "Discrete Mathematics"}, "consultation_date": "2026-06-14", "consultation_time": "14:00", "exam_date": "2026-06-16", "exam_time": "09:00", "staff_id": sh_id, "staff_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Алгебра та геометрія", "en": "Algebra and Geometry"}, "consultation_date": "2026-06-18", "consultation_time": "14:00", "exam_date": "2026-06-20", "exam_time": "09:00", "staff_id": m_id, "staff_name": {"ua": "Мельник Оксана Іванівна", "en": "Melnyk Oksana Ivanivna"}},
        ]},
        # КН-12
        {"group_id": kn12_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Основи програмування", "en": "Fundamentals of Programming"}, "consultation_date": "2026-06-10", "consultation_time": "14:00", "exam_date": "2026-06-12", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Дискретна математика", "en": "Discrete Mathematics"}, "consultation_date": "2026-06-15", "consultation_time": "14:00", "exam_date": "2026-06-17", "exam_time": "09:00", "staff_id": sh_id, "staff_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Вища математика", "en": "Higher Mathematics"}, "consultation_date": "2026-06-19", "consultation_time": "14:00", "exam_date": "2026-06-21", "exam_time": "09:00", "staff_id": l_id, "staff_name": {"ua": "Лисенко Андрій Юрійович", "en": "Lysenko Andriy Yuriiovych"}},
        ]},
        # КН-13
        {"group_id": kn13_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Основи програмування", "en": "Fundamentals of Programming"}, "consultation_date": "2026-06-11", "consultation_time": "14:00", "exam_date": "2026-06-13", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Дискретна математика", "en": "Discrete Mathematics"}, "consultation_date": "2026-06-16", "consultation_time": "14:00", "exam_date": "2026-06-18", "exam_time": "09:00", "staff_id": kr_id, "staff_name": {"ua": "Кравченко Юлія Олексіївна", "en": "Kravchenko Yuliya Oleksiyivna"}},
        ]},
        # КН-21
        {"group_id": kn21_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Алгоритми та структури даних", "en": "Algorithms and Data Structures"}, "consultation_date": "2026-06-10", "consultation_time": "14:00", "exam_date": "2026-06-12", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Організація баз даних", "en": "Database Organization"}, "consultation_date": "2026-06-14", "consultation_time": "14:00", "exam_date": "2026-06-16", "exam_time": "09:00", "staff_id": t_id, "staff_name": {"ua": "Ткаченко Сергій Михайлович", "en": "Tkachenko Serhiy Mykhaylovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Об'єктно-орієнтоване програмування", "en": "Object-Oriented Programming"}, "consultation_date": "2026-06-18", "consultation_time": "14:00", "exam_date": "2026-06-20", "exam_time": "09:00", "staff_id": sh_id, "staff_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
        ]},
        # КН-22
        {"group_id": kn22_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Алгоритми та структури даних", "en": "Algorithms and Data Structures"}, "consultation_date": "2026-06-11", "consultation_time": "14:00", "exam_date": "2026-06-13", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Організація баз даних", "en": "Database Organization"}, "consultation_date": "2026-06-15", "consultation_time": "14:00", "exam_date": "2026-06-17", "exam_time": "09:00", "staff_id": t_id, "staff_name": {"ua": "Ткаченко Сергій Михайлович", "en": "Tkachenko Serhiy Mykhaylovych"}},
        ]},
        # КН-23
        {"group_id": kn23_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Алгоритми та структури даних", "en": "Algorithms and Data Structures"}, "consultation_date": "2026-06-12", "consultation_time": "14:00", "exam_date": "2026-06-14", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Веб-технології", "en": "Web Technologies"}, "consultation_date": "2026-06-17", "consultation_time": "14:00", "exam_date": "2026-06-19", "exam_time": "09:00", "staff_id": l_id, "staff_name": {"ua": "Лисенко Андрій Юрійович", "en": "Lysenko Andriy Yuriiovych"}},
        ]},
        # КН-31
        {"group_id": kn31_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Системне програмування", "en": "Systems Programming"}, "consultation_date": "2026-06-10", "consultation_time": "14:00", "exam_date": "2026-06-12", "exam_time": "09:00", "staff_id": sh_id, "staff_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Комп'ютерні мережі", "en": "Computer Networks"}, "consultation_date": "2026-06-14", "consultation_time": "14:00", "exam_date": "2026-06-16", "exam_time": "09:00", "staff_id": t_id, "staff_name": {"ua": "Ткаченко Сергій Михайлович", "en": "Tkachenko Serhiy Mykhaylovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Штучний інтелект", "en": "Artificial Intelligence"}, "consultation_date": "2026-06-19", "consultation_time": "14:00", "exam_date": "2026-06-21", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
        ]},
        # КН-32
        {"group_id": kn32_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Системне програмування", "en": "Systems Programming"}, "consultation_date": "2026-06-11", "consultation_time": "14:00", "exam_date": "2026-06-13", "exam_time": "09:00", "staff_id": sh_id, "staff_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Комп'ютерні мережі", "en": "Computer Networks"}, "consultation_date": "2026-06-15", "consultation_time": "14:00", "exam_date": "2026-06-17", "exam_time": "09:00", "staff_id": t_id, "staff_name": {"ua": "Ткаченко Сергій Михайлович", "en": "Tkachenko Serhiy Mykhaylovych"}},
        ]},
        # КН-33
        {"group_id": kn33_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Системне програмування", "en": "Systems Programming"}, "consultation_date": "2026-06-12", "consultation_time": "14:00", "exam_date": "2026-06-14", "exam_time": "09:00", "staff_id": sh_id, "staff_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Захист інформації", "en": "Information Security"}, "consultation_date": "2026-06-17", "consultation_time": "14:00", "exam_date": "2026-06-19", "exam_time": "09:00", "staff_id": kr_id, "staff_name": {"ua": "Кравченко Юлія Олексіївна", "en": "Kravchenko Yulia Oleksiivna"}},
        ]},
        # КН-41
        {"group_id": kn41_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Розподілені системи", "en": "Distributed Systems"}, "consultation_date": "2026-06-10", "consultation_time": "14:00", "exam_date": "2026-06-12", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Машинне навчання", "en": "Machine Learning"}, "consultation_date": "2026-06-15", "consultation_time": "14:00", "exam_date": "2026-06-17", "exam_time": "09:00", "staff_id": sh_id, "staff_name": {"ua": "Шевченко Олексій Петрович", "en": "Shevchenko Oleksiy Petrovych"}},
        ]},
        # КН-42
        {"group_id": kn42_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Розподілені системи", "en": "Distributed Systems"}, "consultation_date": "2026-06-11", "consultation_time": "14:00", "exam_date": "2026-06-13", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Управління проєктами", "en": "Project Management"}, "consultation_date": "2026-06-16", "consultation_time": "14:00", "exam_date": "2026-06-18", "exam_time": "09:00", "staff_id": m_id, "staff_name": {"ua": "Мельник Оксана Іванівна", "en": "Melnyk Oksana Ivanivna"}},
        ]},
        # КН-43
        {"group_id": kn43_id, "exams": [
            {"id": str(uuid.uuid4()), "subject": {"ua": "Розподілені системи", "en": "Distributed Systems"}, "consultation_date": "2026-06-12", "consultation_time": "14:00", "exam_date": "2026-06-14", "exam_time": "09:00", "staff_id": p_id, "staff_name": {"ua": "Петренко Іван Олексійович", "en": "Petrenko Ivan Oleksiiovych"}},
            {"id": str(uuid.uuid4()), "subject": {"ua": "Хмарні технології", "en": "Cloud Technologies"}, "consultation_date": "2026-06-18", "consultation_time": "14:00", "exam_date": "2026-06-20", "exam_time": "09:00", "staff_id": l_id, "staff_name": {"ua": "Лисенко Андрій Юрійович", "en": "Lysenko Andriy Yuriiovych"}},
        ]},
    ]
    await db.exam_schedules.insert_many(exam_schedules_seed)

    # ══════════════ PREPARE STUDENTS DATA ══════════════
    students_list = [
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Андрієнко Дмитро Валерійович",
            "email": "andrienko.d@student.com",
            "contact_email": "andrienko.d@student.com",
            "phone": "+380 63 111-22-33",
            "is_approved": True,
            "hashed_password": pwd_context.hash("dima_kn11_pass"),
            "course": 1,
            "semester": "1",
            "group_id": kn11_id,
            "group_name": "КН-11",
            "curator_staff_id": m_id,
            "curator_name": "Мельник Оксана Іванівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Бондар Анна Сергіївна",
            "email": "bondar.a@student.com",
            "contact_email": "bondar.a@student.com",
            "phone": "+380 63 444-55-66",
            "is_approved": True,
            "hashed_password": pwd_context.hash("anna_secure_11"),
            "course": 1,
            "semester": "1",
            "group_id": kn11_id,
            "group_name": "КН-11",
            "curator_staff_id": m_id,
            "curator_name": "Мельник Оксана Іванівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Василенко Ігор Юрійович",
            "email": "vasylenko.i@student.com",
            "contact_email": "vasylenko.i@student.com",
            "phone": "+380 93 777-88-99",
            "is_approved": True,
            "hashed_password": pwd_context.hash("igor_pass_2026"),
            "course": 1,
            "semester": "1",
            "group_id": kn11_id,
            "group_name": "КН-11",
            "curator_staff_id": m_id,
            "curator_name": "Мельник Оксана Іванівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Гриценко Олена Миколаївна",
            "email": "hrytsenko.o@student.com",
            "contact_email": "hrytsenko.o@student.com",
            "phone": "+380 93 000-11-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("olena_kn11"),
            "course": 1,
            "semester": "1",
            "group_id": kn11_id,
            "group_name": "КН-11",
            "curator_staff_id": m_id,
            "curator_name": "Мельник Оксана Іванівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Дмитренко Сергій Петрович",
            "email": "dmytrenko.s@student.com",
            "contact_email": "dmytrenko.s@student.com",
            "phone": "+380 63 333-22-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("sergey_pass_777"),
            "course": 1,
            "semester": "1",
            "group_id": kn11_id,
            "group_name": "КН-11",
            "curator_staff_id": m_id,
            "curator_name": "Мельник Оксана Іванівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Лисенко Артем Ігорович",
            "email": "lysenko.a@student.com",
            "contact_email": "lysenko.a@student.com",
            "phone": "+380 67 555-44-33",
            "is_approved": True,
            "hashed_password": pwd_context.hash("artem_kn12_pass"),
            "course": 1,
            "semester": "1",
            "group_id": kn12_id,
            "group_name": "КН-12",
            "curator_staff_id": l_id,
            "curator_name": "Лисенко Андрій Юрійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Мороз Юлія Віталіївна",
            "email": "moroz.y@student.com",
            "contact_email": "moroz.y@student.com",
            "phone": "+380 50 111-00-99",
            "is_approved": True,
            "hashed_password": pwd_context.hash("julia_secure_12"),
            "course": 1,
            "semester": "1",
            "group_id": kn12_id,
            "group_name": "КН-12",
            "curator_staff_id": l_id,
            "curator_name": "Лисенко Андрій Юрійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Павленко Денис Олександрович",
            "email": "pavlenko.d@student.com",
            "contact_email": "pavlenko.d@student.com",
            "phone": "+380 93 222-33-44",
            "is_approved": True,
            "hashed_password": pwd_context.hash("den_pass_kn12"),
            "course": 1,
            "semester": "1",
            "group_id": kn12_id,
            "group_name": "КН-12",
            "curator_staff_id": l_id,
            "curator_name": "Лисенко Андрій Юрійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Савченко Марія Андріївна",
            "email": "savchenko.m@student.com",
            "contact_email": "savchenko.m@student.com",
            "phone": "+380 97 888-77-66",
            "is_approved": True,
            "hashed_password": pwd_context.hash("mary_kn12_2026"),
            "course": 1,
            "semester": "1",
            "group_id": kn12_id,
            "group_name": "КН-12",
            "curator_staff_id": l_id,
            "curator_name": "Лисенко Андрій Юрійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Козак Владислав Федорович",
            "email": "kozak.v@student.com",
            "contact_email": "kozak.v@student.com",
            "phone": "+380 99 333-44-55",
            "is_approved": True,
            "hashed_password": pwd_context.hash("vlad_secure_pass"),
            "course": 1,
            "semester": "1",
            "group_id": kn12_id,
            "group_name": "КН-12",
            "curator_staff_id": l_id,
            "curator_name": "Лисенко Андрій Юрійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Кузьменко Олена Вікторівна",
            "email": "kuzmenko.o@student.com",
            "contact_email": "kuzmenko.o@student.com",
            "phone": "+380 66 111-22-33",
            "is_approved": True,
            "hashed_password": pwd_context.hash("elena_kn13_2026"),
            "course": 1,
            "semester": "1",
            "group_id": kn13_id,
            "group_name": "КН-13",
            "curator_staff_id": kr_id,
            "curator_name": "Кравченко Юлія Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Марченко Іван Олександрович",
            "email": "marchenko.i@student.com",
            "contact_email": "marchenko.i@student.com",
            "phone": "+380 67 999-00-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("ivan_marchenko_77"),
            "course": 1,
            "semester": "1",
            "group_id": kn13_id,
            "group_name": "КН-13",
            "curator_staff_id": kr_id,
            "curator_name": "Кравченко Юлія Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Титаренко Дар'я Сергіївна",
            "email": "tytarenko.d@student.com",
            "contact_email": "tytarenko.d@student.com",
            "phone": "+380 95 444-33-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("dasha_secure_13"),
            "course": 1,
            "semester": "1",
            "group_id": kn13_id,
            "group_name": "КН-13",
            "curator_staff_id": kr_id,
            "curator_name": "Кравченко Юлія Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Онищенко Ростислав Ігорович",
            "email": "onyshchenko.r@student.com",
            "contact_email": "onyshchenko.r@student.com",
            "phone": "+380 63 555-66-77",
            "is_approved": True,
            "hashed_password": pwd_context.hash("rost_kn13_pass"),
            "course": 1,
            "semester": "1",
            "group_id": kn13_id,
            "group_name": "КН-13",
            "curator_staff_id": kr_id,
            "curator_name": "Кравченко Юлія Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Сидоренко Анастасія Юріївна",
            "email": "sydorenko.a@student.com",
            "contact_email": "sydorenko.a@student.com",
            "phone": "+380 99 123-99-88",
            "is_approved": True,
            "hashed_password": pwd_context.hash("nastya_pass_13"),
            "course": 1,
            "semester": "1",
            "group_id": kn13_id,
            "group_name": "КН-13",
            "curator_staff_id": kr_id,
            "curator_name": "Кравченко Юлія Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Ящеріцин Роман Євгенович",
            "email": "student@gmail.com",
            "contact_email": "student@gmail.com",
            "phone": "+380 96 123-45-67",
            "is_approved": True,
            "hashed_password": pwd_context.hash("student_pass_2026"),
            "course": 2,
            "semester": "3",
            "group_id": kn21_id,
            "group_name": "КН-21",
            "curator_staff_id": t_id,
            "curator_name": "Ткаченко Сергій Михайлович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Кравчук Юлія Олександрівна",
            "email": "kravchuk.y@student.com",
            "contact_email": "kravchuk.y@student.com",
            "phone": "+380 50 777-66-55",
            "is_approved": True,
            "hashed_password": pwd_context.hash("yulia_secure_14"),
            "course": 2,
            "semester": "3",
            "group_id": kn21_id,
            "group_name": "КН-21",
            "curator_staff_id": t_id,
            "curator_name": "Ткаченко Сергій Михайлович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Тимошенко Артем Ігорович",
            "email": "tymoshenko.a@student.com",
            "contact_email": "tymoshenko.a@student.com",
            "phone": "+380 93 444-11-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("artem_pass_777"),
            "course": 2,
            "semester": "3",
            "group_id": kn21_id,
            "group_name": "КН-21",
            "curator_staff_id": t_id,
            "curator_name": "Ткаченко Сергій Михайлович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Ковальчук Світлана Миколаївна",
            "email": "kovalchuk.s@student.com",
            "contact_email": "kovalchuk.s@student.com",
            "phone": "+380 67 000-88-99",
            "is_approved": True,
            "hashed_password": pwd_context.hash("sveta_kn14_pass"),
            "course": 2,
            "semester": "3",
            "group_id": kn21_id,
            "group_name": "КН-21",
            "curator_staff_id": t_id,
            "curator_name": "Ткаченко Сергій Михайлович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Захарченко Олег Петрович",
            "email": "zakharchenko.o@student.com",
            "contact_email": "zakharchenko.o@student.com",
            "phone": "+380 63 222-99-00",
            "is_approved": True,
            "hashed_password": pwd_context.hash("oleg_secure_14"),
            "course": 2,
            "semester": "3",
            "group_id": kn21_id,
            "group_name": "КН-21",
            "curator_staff_id": t_id,
            "curator_name": "Ткаченко Сергій Михайлович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Бережний Максим Олексійович",
            "email": "berezhnyi.m@student.com",
            "contact_email": "berezhnyi.m@student.com",
            "phone": "+380 95 111-22-33",
            "is_approved": True,
            "hashed_password": pwd_context.hash("max_kn22_pass"),
            "course": 2,
            "semester": "3",
            "group_id": kn22_id,
            "group_name": "КН-22",
            "curator_staff_id": b_id,
            "curator_name": "Бондаренко Наталія Вікторівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Гончар Альона Ігорівна",
            "email": "honchar.a@student.com",
            "contact_email": "honchar.a@student.com",
            "phone": "+380 67 444-55-66",
            "is_approved": True,
            "hashed_password": pwd_context.hash("alyona_secure_22"),
            "course": 2,
            "semester": "3",
            "group_id": kn22_id,
            "group_name": "КН-22",
            "curator_staff_id": b_id,
            "curator_name": "Бондаренко Наталія Вікторівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Дорошенко Кирило Сергійович",
            "email": "doroshenko.k@student.com",
            "contact_email": "doroshenko.k@student.com",
            "phone": "+380 63 777-88-99",
            "is_approved": True,
            "hashed_password": pwd_context.hash("kyrylo_kn22"),
            "course": 2,
            "semester": "3",
            "group_id": kn22_id,
            "group_name": "КН-22",
            "curator_staff_id": b_id,
            "curator_name": "Бондаренко Наталія Вікторівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Єременко Олександра Павлівна",
            "email": "eremenko.o@student.com",
            "contact_email": "eremenko.o@student.com",
            "phone": "+380 50 000-11-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("sasha_pass_2026"),
            "course": 2,
            "semester": "3",
            "group_id": kn22_id,
            "group_name": "КН-22",
            "curator_staff_id": b_id,
            "curator_name": "Бондаренко Наталія Вікторівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Жук Артем Миколайович",
            "email": "zhuk.a@student.com",
            "contact_email": "zhuk.a@student.com",
            "phone": "+380 93 333-22-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("artem_zhuk_22"),
            "course": 2,
            "semester": "3",
            "group_id": kn22_id,
            "group_name": "КН-22",
            "curator_staff_id": b_id,
            "curator_name": "Бондаренко Наталія Вікторівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Зінченко Андрій Віталійович",
            "email": "zinchenko.a@student.com",
            "contact_email": "zinchenko.a@student.com",
            "phone": "+380 63 111-99-00",
            "is_approved": True,
            "hashed_password": pwd_context.hash("andrii_kn23_pass"),
            "course": 2,
            "semester": "3",
            "group_id": kn23_id,
            "group_name": "КН-23",
            "curator_staff_id": i_id,
            "curator_name": "Іванов Дмитро Сергійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Клименко Світлана Олегівна",
            "email": "klymenko.s@student.com",
            "contact_email": "klymenko.s@student.com",
            "phone": "+380 66 222-33-44",
            "is_approved": True,
            "hashed_password": pwd_context.hash("sveta_secure_23"),
            "course": 2,
            "semester": "3",
            "group_id": kn23_id,
            "group_name": "КН-23",
            "curator_staff_id": i_id,
            "curator_name": "Іванов Дмитро Сергійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Мазур Ігор Миколайович",
            "email": "mazur.i@student.com",
            "contact_email": "mazur.i@student.com",
            "phone": "+380 67 555-66-77",
            "is_approved": True,
            "hashed_password": pwd_context.hash("igor_mazur_pass"),
            "course": 2,
            "semester": "3",
            "group_id": kn23_id,
            "group_name": "КН-23",
            "curator_staff_id": i_id,
            "curator_name": "Іванов Дмитро Сергійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Олійник Вікторія Дмитрівна",
            "email": "oliinyk.v@student.com",
            "contact_email": "oliinyk.v@student.com",
            "phone": "+380 50 888-99-00",
            "is_approved": True,
            "hashed_password": pwd_context.hash("viki_kn23_secure"),
            "course": 2,
            "semester": "3",
            "group_id": kn23_id,
            "group_name": "КН-23",
            "curator_staff_id": i_id,
            "curator_name": "Іванов Дмитро Сергійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Поліщук Владислав Ігорович",
            "email": "polishchuk.v@student.com",
            "contact_email": "polishchuk.v@student.com",
            "phone": "+380 93 444-55-66",
            "is_approved": True,
            "hashed_password": pwd_context.hash("vlad_polishchuk_23"),
            "course": 2,
            "semester": "3",
            "group_id": kn23_id,
            "group_name": "КН-23",
            "curator_staff_id": i_id,
            "curator_name": "Іванов Дмитро Сергійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Сидорчук Віталій Андрійович",
            "email": "sydorchuk.v@student.com",
            "contact_email": "sydorchuk.v@student.com",
            "phone": "+380 67 111-00-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("vitalik_kn31_pass"),
            "course": 3,
            "semester": "5",
            "group_id": kn31_id,
            "group_name": "КН-31",
            "curator_staff_id": sh_id,
            "curator_name": "Шевченко Олексій Петрович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Ткач Юлія Олександрівна",
            "email": "tkach.y@student.com",
            "contact_email": "tkach.y@student.com",
            "phone": "+380 50 222-33-44",
            "is_approved": True,
            "hashed_password": pwd_context.hash("julia_kn31_2026"),
            "course": 3,
            "semester": "5",
            "group_id": kn31_id,
            "group_name": "КН-31",
            "curator_staff_id": sh_id,
            "curator_name": "Шевченко Олексій Петрович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Федоренко Артем Ігорович",
            "email": "fedorenko.a@student.com",
            "contact_email": "fedorenko.a@student.com",
            "phone": "+380 93 555-66-77",
            "is_approved": True,
            "hashed_password": pwd_context.hash("artem_fed_31"),
            "course": 3,
            "semester": "5",
            "group_id": kn31_id,
            "group_name": "КН-31",
            "curator_staff_id": sh_id,
            "curator_name": "Шевченко Олексій Петрович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Харченко Надія Петрівна",
            "email": "kharchenko.n@student.com",
            "contact_email": "kharchenko.n@student.com",
            "phone": "+380 63 888-99-00",
            "is_approved": True,
            "hashed_password": pwd_context.hash("nadya_secure_31"),
            "course": 3,
            "semester": "5",
            "group_id": kn31_id,
            "group_name": "КН-31",
            "curator_staff_id": sh_id,
            "curator_name": "Шевченко Олексій Петрович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Яковенко Сергій Дмитрович",
            "email": "yakovenko.s@student.com",
            "contact_email": "yakovenko.s@student.com",
            "phone": "+380 99 000-11-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("sergiy_yakovenko_31"),
            "course": 3,
            "semester": "5",
            "group_id": kn31_id,
            "group_name": "КН-31",
            "curator_staff_id": sh_id,
            "curator_name": "Шевченко Олексій Петрович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Васильчук Ігор Петрович",
            "email": "vasylchuk.i@student.com",
            "contact_email": "vasylchuk.i@student.com",
            "phone": "+380 67 333-44-55",
            "is_approved": True,
            "hashed_password": pwd_context.hash("igor_kn32_pass"),
            "course": 3,
            "semester": "5",
            "group_id": kn32_id,
            "group_name": "КН-32",
            "curator_staff_id": o_id,
            "curator_name": "Олійник Тетяна Василівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Герасименко Анна Віталіївна",
            "email": "herasymenko.a@student.com",
            "contact_email": "herasymenko.a@student.com",
            "phone": "+380 50 666-77-88",
            "is_approved": True,
            "hashed_password": pwd_context.hash("anna_secure_32"),
            "course": 3,
            "semester": "5",
            "group_id": kn32_id,
            "group_name": "КН-32",
            "curator_staff_id": o_id,
            "curator_name": "Олійник Тетяна Василівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Даниленко Максим Сергійович",
            "email": "danylenko.m@student.com",
            "contact_email": "danylenko.m@student.com",
            "phone": "+380 93 111-22-00",
            "is_approved": True,
            "hashed_password": pwd_context.hash("max_dan_kn32"),
            "course": 3,
            "semester": "5",
            "group_id": kn32_id,
            "group_name": "КН-32",
            "curator_staff_id": o_id,
            "curator_name": "Олійник Тетяна Василівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Костюк Марія Дмитрівна",
            "email": "kostiuk.m@student.com",
            "contact_email": "kostiuk.m@student.com",
            "phone": "+380 63 444-99-88",
            "is_approved": True,
            "hashed_password": pwd_context.hash("maria_pass_2026"),
            "course": 3,
            "semester": "5",
            "group_id": kn32_id,
            "group_name": "КН-32",
            "curator_staff_id": o_id,
            "curator_name": "Олійник Тетяна Василівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Левченко Денис Юрійович",
            "email": "levchenko.d@student.com",
            "contact_email": "levchenko.d@student.com",
            "phone": "+380 99 777-00-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("denis_lev_32"),
            "course": 3,
            "semester": "5",
            "group_id": kn32_id,
            "group_name": "КН-32",
            "curator_staff_id": o_id,
            "curator_name": "Олійник Тетяна Василівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Назаренко Дмитро Олександрович",
            "email": "nazarenko.d@student.com",
            "contact_email": "nazarenko.d@student.com",
            "phone": "+380 66 555-44-33",
            "is_approved": True,
            "hashed_password": pwd_context.hash("dima_kn33_pass"),
            "course": 3,
            "semester": "5",
            "group_id": kn33_id,
            "group_name": "КН-33",
            "curator_staff_id": pl_id,
            "curator_name": "Поліщук Василь Миколайович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Осадча Катерина Володимирівна",
            "email": "osadcha.k@student.com",
            "contact_email": "osadcha.k@student.com",
            "phone": "+380 67 111-88-99",
            "is_approved": True,
            "hashed_password": pwd_context.hash("katya_secure_33"),
            "course": 3,
            "semester": "5",
            "group_id": kn33_id,
            "group_name": "КН-33",
            "curator_staff_id": pl_id,
            "curator_name": "Поліщук Василь Миколайович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Пилипенко Юрій Сергійович",
            "email": "pylypenko.y@student.com",
            "contact_email": "pylypenko.y@student.com",
            "phone": "+380 93 444-55-66",
            "is_approved": True,
            "hashed_password": pwd_context.hash("yura_pass_kn33"),
            "course": 3,
            "semester": "5",
            "group_id": kn33_id,
            "group_name": "КН-33",
            "curator_staff_id": pl_id,
            "curator_name": "Поліщук Василь Миколайович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Руденко Анна Миколаївна",
            "email": "rudenko.a@student.com",
            "contact_email": "rudenko.a@student.com",
            "phone": "+380 50 777-22-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("anya_kn33_2026"),
            "course": 3,
            "semester": "5",
            "group_id": kn33_id,
            "group_name": "КН-33",
            "curator_staff_id": pl_id,
            "curator_name": "Поліщук Василь Миколайович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Степаненко Олег Ігорович",
            "email": "stepanenko.o@student.com",
            "contact_email": "stepanenko.o@student.com",
            "phone": "+380 95 000-44-55",
            "is_approved": True,
            "hashed_password": pwd_context.hash("oleg_step_33"),
            "course": 3,
            "semester": "5",
            "group_id": kn33_id,
            "group_name": "КН-33",
            "curator_staff_id": pl_id,
            "curator_name": "Поліщук Василь Миколайович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Тарасенко Ігор Володимирович",
            "email": "tarasenko.i@student.com",
            "contact_email": "tarasenko.i@student.com",
            "phone": "+380 67 222-11-00",
            "is_approved": True,
            "hashed_password": pwd_context.hash("igor_kn41_2026"),
            "course": 4,
            "semester": "7",
            "group_id": kn41_id,
            "group_name": "КН-41",
            "curator_staff_id": k_id,
            "curator_name": "Коваленко Марія Степанівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Устименко Олена Сергіївна",
            "email": "ustymenko.o@student.com",
            "contact_email": "ustymenko.o@student.com",
            "phone": "+380 50 333-44-55",
            "is_approved": True,
            "hashed_password": pwd_context.hash("elena_secure_41"),
            "course": 4,
            "semester": "7",
            "group_id": kn41_id,
            "group_name": "КН-41",
            "curator_staff_id": k_id,
            "curator_name": "Коваленко Марія Степанівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Філіппов Андрій Миколайович",
            "email": "filippov.a@student.com",
            "contact_email": "filippov.a@student.com",
            "phone": "+380 93 666-55-44",
            "is_approved": True,
            "hashed_password": pwd_context.hash("andrii_kn41_pass"),
            "course": 4,
            "semester": "7",
            "group_id": kn41_id,
            "group_name": "КН-41",
            "curator_staff_id": k_id,
            "curator_name": "Коваленко Марія Степанівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Цимбал Марія Олександрівна",
            "email": "tsymbal.m@student.com",
            "contact_email": "tsymbal.m@student.com",
            "phone": "+380 63 999-88-77",
            "is_approved": True,
            "hashed_password": pwd_context.hash("maria_secure_pass"),
            "course": 4,
            "semester": "7",
            "group_id": kn41_id,
            "group_name": "КН-41",
            "curator_staff_id": k_id,
            "curator_name": "Коваленко Марія Степанівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Черненко Вадим Ігорович",
            "email": "chernenko.v@student.com",
            "contact_email": "chernenko.v@student.com",
            "phone": "+380 95 123-00-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("vadym_kn41_77"),
            "course": 4,
            "semester": "7",
            "group_id": kn41_id,
            "group_name": "КН-41",
            "curator_staff_id": k_id,
            "curator_name": "Коваленко Марія Степанівна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Шпак Валерій Дмитрович",
            "email": "shpak.v@student.com",
            "contact_email": "shpak.v@student.com",
            "phone": "+380 66 111-33-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("valerii_kn42_pass"),
            "course": 4,
            "semester": "7",
            "group_id": kn42_id,
            "group_name": "КН-42",
            "curator_staff_id": p_id,
            "curator_name": "Петренко Іван Олексійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Юхименко Карина Олегівна",
            "email": "yukhymenko.k@student.com",
            "contact_email": "yukhymenko.k@student.com",
            "phone": "+380 67 444-99-00",
            "is_approved": True,
            "hashed_password": pwd_context.hash("karina_secure_42"),
            "course": 4,
            "semester": "7",
            "group_id": kn42_id,
            "group_name": "КН-42",
            "curator_staff_id": p_id,
            "curator_name": "Петренко Іван Олексійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Яремчук Богдан Васильович",
            "email": "yaremchuk.b@student.com",
            "contact_email": "yaremchuk.b@student.com",
            "phone": "+380 93 111-22-33",
            "is_approved": True,
            "hashed_password": pwd_context.hash("bogdan_kn42_2026"),
            "course": 4,
            "semester": "7",
            "group_id": kn42_id,
            "group_name": "КН-42",
            "curator_staff_id": p_id,
            "curator_name": "Петренко Іван Олексійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Бєлов Артем Олександрович",
            "email": "bielov.a@student.com",
            "contact_email": "bielov.a@student.com",
            "phone": "+380 50 555-66-77",
            "is_approved": True,
            "hashed_password": pwd_context.hash("artem_bielov_pass"),
            "course": 4,
            "semester": "7",
            "group_id": kn42_id,
            "group_name": "КН-42",
            "curator_staff_id": p_id,
            "curator_name": "Петренко Іван Олексійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Вовк Тетяна Сергіївна",
            "email": "vovk.t@student.com",
            "contact_email": "vovk.t@student.com",
            "phone": "+380 63 000-44-88",
            "is_approved": True,
            "hashed_password": pwd_context.hash("tanya_vovk_42"),
            "course": 4,
            "semester": "7",
            "group_id": kn42_id,
            "group_name": "КН-42",
            "curator_staff_id": p_id,
            "curator_name": "Петренко Іван Олексійович",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Григоренко Петро Олексійович",
            "email": "hryhorenko.p@student.com",
            "contact_email": "hryhorenko.p@student.com",
            "phone": "+380 67 888-11-22",
            "is_approved": True,
            "hashed_password": pwd_context.hash("petro_kn43_2026"),
            "course": 4,
            "semester": "7",
            "group_id": kn43_id,
            "group_name": "КН-43",
            "curator_staff_id": s_id,
            "curator_name": "Ситник Лариса Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Дяченко Оксана Володимирівна",
            "email": "diachenko.o@student.com",
            "contact_email": "diachenko.o@student.com",
            "phone": "+380 50 222-00-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("oksana_secure_43"),
            "course": 4,
            "semester": "7",
            "group_id": kn43_id,
            "group_name": "КН-43",
            "curator_staff_id": s_id,
            "curator_name": "Ситник Лариса Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Єфименко Микола Юрійович",
            "email": "yefymenko.m@student.com",
            "contact_email": "yefymenko.m@student.com",
            "phone": "+380 93 444-77-88",
            "is_approved": True,
            "hashed_password": pwd_context.hash("mykola_kn43_pass"),
            "course": 4,
            "semester": "7",
            "group_id": kn43_id,
            "group_name": "КН-43",
            "curator_staff_id": s_id,
            "curator_name": "Ситник Лариса Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Зайцева Ірина Анатоліївна",
            "email": "zaitseva.i@student.com",
            "contact_email": "zaitseva.i@student.com",
            "phone": "+380 63 555-44-11",
            "is_approved": True,
            "hashed_password": pwd_context.hash("ira_zaitseva_pass"),
            "course": 4,
            "semester": "7",
            "group_id": kn43_id,
            "group_name": "КН-43",
            "curator_staff_id": s_id,
            "curator_name": "Ситник Лариса Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "role": "student",
            "is_seeded": True,
            "name": "Климов Сергій Олександрович",
            "email": "klymov.s@student.com",
            "contact_email": "klymov.s@student.com",
            "phone": "+380 97 000-22-33",
            "is_approved": True,
            "hashed_password": pwd_context.hash("serg_klim_43"),
            "course": 4,
            "semester": "7",
            "group_id": kn43_id,
            "group_name": "КН-43",
            "curator_staff_id": s_id,
            "curator_name": "Ситник Лариса Олексіївна",
            "created_at": datetime.utcnow().isoformat(),
        }
    ]

    # ══════════════ SEED STUDENTS (INSERT MANY) ══════════════
    emails_to_delete = [s["email"] for s in students_list]
    await db.users.delete_many({"email": {"$in": emails_to_delete}})
    if students_list:
        await db.users.insert_many(students_list)
        for s in students_list:
            logger.info(f"Student seeded: {s['email']}")

    # ══════════════ SEED ADMIN USER ══════════════
    admin_exists = await db.users.find_one({"email": "admin@gmail.com"})
    if not admin_exists:
        test_admin = {
            "id": str(uuid.uuid4()),
            "role": "admin",
            "name": "Адміністратор",
            "email": "admin@gmail.com",
            "is_approved": True,
            "hashed_password": pwd_context.hash("admin123"),
            "created_at": datetime.utcnow().isoformat(),
        }
        await db.users.insert_one(test_admin)
        logger.info("Test admin created: admin@gmail.com / admin123")

    # ══════════════ SEED REMAINING STAFF USERS ══════════════
    remaining_staff = [
        {"email": "petenko.i@gmail.com",    "name": "Петренко Іван Олексійович",       "staff_id": p_id, "phone": "+380 44 555-11-22"},
        # {"email": "kovalenko.m@gmail.com",  "name": "Коваленко Марія Степанівна",      "staff_id": k_id},
        {"email": "shevchenko.o@gmail.com", "name": "Шевченко Олексій Петрович",       "staff_id": sh_id},
        {"email": "bondarenko.n@gmail.com", "name": "Бондаренко Наталія Вікторівна",   "staff_id": b_id},
        # {"email": "tkachenko.s@gmail.com",  "name": "Ткаченко Сергій Михайлович",      "staff_id": t_id},
        {"email": "melnyk.o@gmail.com",     "name": "Мельник Оксана Іванівна",         "staff_id": m_id},
        {"email": "lysenko.a@gmail.com",    "name": "Лисенко Андрій Юрійович",         "staff_id": l_id},
        {"email": "kravchenko.y@gmail.com", "name": "Кравченко Юлія Олександрівна",   "staff_id": kr_id},
        # {"email": "ivanov.d@gmail.com",     "name": "Іванов Дмитро Сергійович",        "staff_id": i_id},
        {"email": "oliynyk.t@gmail.com",    "name": "Олійник Тетяна Василівна",        "staff_id": o_id},
        {"email": "polishchuk.v@gmail.com", "name": "Поліщук Василь Миколайович",     "staff_id": pl_id},
        {"email": "sytnyk.l@gmail.com",     "name": "Ситник Лариса Олексіївна",        "staff_id": s_id},
    ]
    
    staff_hashed_password = pwd_context.hash("staff123")
    current_time_iso = datetime.utcnow().isoformat()

    for s in remaining_staff:
        exists = await db.users.find_one({"email": s["email"]})
        if not exists:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "role": "staff",
                "name": s["name"],
                "email": s["email"],
                "contact_email": s["email"],
                "phone": s.get("phone", ""),
                "is_approved": True,
                "hashed_password": staff_hashed_password,
                "staff_id": s["staff_id"],
                "created_at": current_time_iso,
            })
            logger.info(f"Test staff created: {s['email']} / staff123")

    # ══ GROUP SCHEDULE SEED ══
    await db.group_schedules.delete_many({})
    schedules = [
        # ── КУРС 1 ──
        {
            "group_id": kn11_id,
            "monday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Машинне навчання", "en": "Machine Learning"}, "room": {"ua": "Ауд. 101", "en": "Aud. 101"}, "teacher": {"ua": "ст.викл. Лисенко А.Ю.", "en": "Sen.Lect. Lysenko A.Yu."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Основи програмування (C++)", "en": "Foundations of Programming (C++)"}, "room": {"ua": "Лаб. 302", "en": "Lab. 302"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
            ],
            "tuesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Дискретна математика", "en": "Discrete Mathematics"}, "room": {"ua": "Ауд. 112", "en": "Aud. 112"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 305", "en": "Aud. 305"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Основи програмування (практ.)", "en": "Foundations of Programming (Prac.)"}, "room": {"ua": "Лаб. 302", "en": "Lab. 302"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
            ],
            "wednesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Вища математика (практ.)", "en": "Higher Mathematics (Prac.)"}, "room": {"ua": "Ауд. 108", "en": "Aud. 108"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Архітектура ком'ютерів", "en": "Computer Architecture"}, "room": {"ua": "Ауд. 210", "en": "Aud. 210"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Дискретна математика (практ.)", "en": "Discrete Mathematics (Prac.)"}, "room": {"ua": "Ауд. 112", "en": "Aud. 112"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 305", "en": "Aud. 305"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Архітектура комп'ютерів (лаб.)", "en": "Computer Architecture (Lab)"}, "room": {"ua": "Лаб. 210", "en": "Lab. 210"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
            ],
        },
        {
            "group_id": kn12_id,
            "monday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Вища математика", "en": "Higher Mathematics"}, "room": {"ua": "Ауд. 102", "en": "Aud. 102"}, "teacher": {"ua": "доц. Лисенко А.Ю.", "en": "Assoc.Prof. Lysenko A.Yu."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Основи програмування (C++)", "en": "Foundations of Programming (C++)"}, "room": {"ua": "Лаб. 303", "en": "Lab. 303"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
            ],
            "tuesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 306", "en": "Aud. 306"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Архітектура комп'ютерів", "en": "Computer Architecture"}, "room": {"ua": "Ауд. 211", "en": "Aud. 211"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
            ],
            "wednesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Дискретна математика", "en": "Discrete Mathematics"}, "room": {"ua": "Ауд. 113", "en": "Aud. 113"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Основи програмування (практ.)", "en": "Foundations of Programming (Prac.)"}, "room": {"ua": "Лаб. 303", "en": "Lab. 303"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "thursday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Вища математика (практ.)", "en": "Higher Mathematics (Prac.)"}, "room": {"ua": "Ауд. 109", "en": "Aud. 109"}, "teacher": {"ua": "доц. Лисенко А.Ю.", "en": "Assoc.Prof. Lysenko A.Yu."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Дискретна математика (практ.)", "en": "Discrete Mathematics (Prac.)"}, "room": {"ua": "Ауд. 113", "en": "Aud. 113"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Архітектура комп'ютерів (лаб.)", "en": "Computer Architecture (Lab)",}, "room": {"ua": "Лаб. 211", "en": "Lab. 211"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 306", "en": "Aud. 306"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
            ],
        },
        {
            "group_id": kn13_id,
            "monday": [
                {"time": "13:00 – 14:35", "subject": {"ua": "Вища математика", "en": "Higher Mathematics"}, "room": {"ua": "Ауд. 103", "en": "Aud. 103"}, "teacher": {"ua": "ст.викл. Кравченко Ю.О.", "en": "Sen.Lect. Kravchenko Yu.O."}},
                {"time": "15:00 – 16:35", "subject": {"ua": "Дискретна математика", "en": "Discrete Mathematics"}, "room": {"ua": "Ауд. 114", "en": "Aud. 114"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
            "tuesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Основи програмування (C++)", "en": "Foundations of Programming (C++)"}, "room": {"ua": "Лаб. 304", "en": "Lab. 304"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 307", "en": "Aud. 307"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
            ],
            "wednesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Архітектура комп'ютерів", "en": "Computer Architecture"}, "room": {"ua": "Ауд. 212", "en": "Aud. 212"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Вища математика (практ.)", "en": "Higher Mathematics (Prac.)"}, "room": {"ua": "Ауд. 103", "en": "Aud. 103"}, "teacher": {"ua": "ст.викл. Кравченко Ю.О.", "en": "Sen.Lect. Kravchenko Yu.O."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Основи програмування (практ.)", "en": "Foundations of Programming (Prac.)"}, "room": {"ua": "Лаб. 304", "en": "Lab. 304"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Дискретна математика (практ.)", "en": "Discrete Mathematics (Prac.)"}, "room": {"ua": "Ауд. 114", "en": "Aud. 114"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
            "friday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Архітектура комп'ютерів (лаб.)", "en": "Computer Architecture (Lab)"}, "room": {"ua": "Лаб. 212", "en": "Lab. 212"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
            ],
        },
        # ── КУРС 2 ──
        {
            "group_id": kn21_id,
            "monday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Алгоритми та структури даних", "en": "Algorithms and Data Structures"}, "room": {"ua": "Ауд. 301", "en": "Aud. 301"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Бази даних", "en": "Databases"}, "room": {"ua": "Ауд. 215", "en": "Aud. 215"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Дискретна математика", "en": "Discrete Mathematics"}, "room": {"ua": "Ауд. 112", "en": "Aud. 112"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
            "tuesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Об'єктно-орієнтоване програмування", "en": "Object-Oriented Programming"}, "room": {"ua": "Ауд. 302", "en": "Aud. 302"}, "teacher": {"ua": "доц. Ткаченко С.М.", "en": "Assoc.Prof. Tkachenko S.M."}},
                {"time": "12:10 – 13:45", "subject": {"ua": "Веб-розробка (практ.)", "en": "Web Development (Prac.)"}, "room": {"ua": "Лаб. 205", "en": "Lab. 205"}, "teacher": {"ua": "доц. Ткаченко С.М.", "en": "Assoc.Prof. Tkachenko S.M."}},
            ],
            "wednesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Бази даних (лаб.)", "en": "Databases (Lab)"}, "room": {"ua": "Лаб. 215", "en": "Lab. 215"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
                {"time": "12:10 – 13:45", "subject": {"ua": "Комп'ютерна графіка", "en": "Computer Graphics"}, "room": {"ua": "Ауд. 312", "en": "Aud. 312"}, "teacher": {"ua": "ст.викл. Кравченко Ю.О.", "en": "Sen.Lect. Kravchenko Yu.O."}},
                {"time": "13:50 – 15:25", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 305", "en": "Aud. 305"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
                {"time": "15:30 – 17:05", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Алгоритми та структури даних (лаб.)", "en": "Algorithms and Data Structures (Lab)"}, "room": {"ua": "Лаб. 301", "en": "Lab. 301"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "12:10 – 13:45", "subject": {"ua": "Операційні системи", "en": "Operating Systems"}, "room": {"ua": "Ауд. 210", "en": "Aud. 210"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
                {"time": "13:50 – 15:25", "subject": {"ua": "Математичний аналіз", "en": "Mathematical Analysis"}, "room": {"ua": "Ауд. 108", "en": "Aud. 108"}, "teacher": {"ua": "доц. Лисенко А.Ю.", "en": "Assoc.Prof. Lysenko A.Yu."}},
            ],
            "friday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Теорія ймовірностей", "en": "Probability Theory"}, "room": {"ua": "Ауд. 201", "en": "Aud. 201"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "12:10 – 13:45", "subject": {"ua": "Програмування (ООП лаб.)", "en": "Programming (OOP Lab)"}, "room": {"ua": "Лаб. 302", "en": "Lab. 302"}, "teacher": {"ua": "доц. Ткаченко С.М.", "en": "Assoc.Prof. Tkachenko S.M."}},
            ],
        },
        {
            "group_id": kn22_id,
            "monday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Алгоритми та структури даних", "en": "Algorithms and Data Structures"}, "room": {"ua": "Ауд. 303", "en": "Aud. 303"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Операційні системи", "en": "Operating Systems"}, "room": {"ua": "Ауд. 211", "en": "Aud. 211"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
            ],
            "tuesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Бази даних", "en": "Databases"}, "room": {"ua": "Ауд. 216", "en": "Aud. 216"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Теорія ймовірностей", "en": "Probability Theory"}, "room": {"ua": "Ауд. 202", "en": "Aud. 202"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 306", "en": "Aud. 306"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
            ],
            "wednesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Об'єктно-орієнтоване програмування", "en": "Object-Oriented Programming"}, "room": {"ua": "Ауд. 303", "en": "Aud. 303"}, "teacher": {"ua": "доц. Ткаченко С.М.", "en": "Assoc.Prof. Tkachenko S.M."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Алгоритми та структури даних (лаб.)", "en": "Algorithms and Data Structures (Lab)"}, "room": {"ua": "Лаб. 303", "en": "Lab. 303"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
            ],
            "thursday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Бази даних (лаб.)", "en": "Databases (Lab)"}, "room": {"ua": "Лаб. 216", "en": "Lab. 216"}, "teacher": {"ua": "доц. Бондаренко Н.В.", "en": "Assoc.Prof. Bondarenko N.V."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Веб-розробка (практ.)", "en": "Web Development (Prac.)"}, "room": {"ua": "Лаб. 206", "en": "Lab. 206"}, "teacher": {"ua": "доц. Ткаченко С.М.", "en": "Assoc.Prof. Tkachenko S.M."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Математичний аналіз", "en": "Mathematical Analysis"}, "room": {"ua": "Ауд. 109", "en": "Aud. 109"}, "teacher": {"ua": "доц. Лисенко А.Ю.", "en": "Assoc.Prof. Lysenko A.Yu."}},
            ],
        },
        {
            "group_id": kn23_id,
            "monday": [
                {"time": "13:00 – 14:35", "subject": {"ua": "Об'єктно-орієнтоване програмування", "en": "Object-Oriented Programming"}, "room": {"ua": "Ауд. 304", "en": "Aud. 304"}, "teacher": {"ua": "доц. Ткаченко С.М.", "en": "Assoc.Prof. Tkachenko S.M."}},
                {"time": "15:00 – 16:35", "subject": {"ua": "Теорія ймовірностей", "en": "Probability Theory"}, "room": {"ua": "Ауд. 203", "en": "Aud. 203"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
            ],
            "tuesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Алгоритми та структури даних", "en": "Algorithms and Data Structures"}, "room": {"ua": "Ауд. 304", "en": "Aud. 304"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Бази даних", "en": "Databases"}, "room": {"ua": "Ауд. 217", "en": "Aud. 217"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
            ],
            "wednesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Операційні системи", "en": "Operating Systems"}, "room": {"ua": "Ауд. 212", "en": "Aud. 212"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Англійська мова", "en": "English Language"}, "room": {"ua": "Ауд. 307", "en": "Aud. 307"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Математичний аналіз", "en": "Mathematical Analysis"}, "room": {"ua": "Ауд. 110", "en": "Aud. 110"}, "teacher": {"ua": "доц. Лисенко А.Ю.", "en": "Assoc.Prof. Lysenko A.Yu."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Алгоритми та структури даних (лаб.)", "en": "Algorithms and Data Structures (Lab)"}, "room": {"ua": "Лаб. 304", "en": "Lab. 304"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Бази даних (лаб.)", "en": "Databases (Lab)"}, "room": {"ua": "Лаб. 217", "en": "Lab. 217"}, "teacher": {"ua": "ст.викл. Іванов Д.С.", "en": "Sen.Lect. Ivanov D.S."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Веб-розробка (практ.)", "en": "Web Development (Prac.)"}, "room": {"ua": "Лаб. 207", "en": "Lab. 207"}, "teacher": {"ua": "доц. Ткаченко С.М.", "en": "Assoc.Prof. Tkachenko S.M."}},
            ],
        },
        # ── КУРС 3 ──
        {
            "group_id": kn31_id,
            "monday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Розробка ПЗ (Agile/Scrum)", "en": "Software Development (Agile/Scrum)"}, "room": {"ua": "Ауд. 401", "en": "Aud. 401"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Комп'ютерні мережі", "en": "Computer Networks"}, "room": {"ua": "Ауд. 312", "en": "Aud. 312"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "tuesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Машинне навчання", "en": "Machine Learning"}, "room": {"ua": "Лаб. 401", "en": "Lab. 401"}, "teacher": {"ua": "ст.викл. Лисенко А.Ю.", "en": "Sen.Lect. Lysenko A.Yu."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Захист інформації", "en": "Information Security"}, "room": {"ua": "Ауд. 313", "en": "Aud. 313"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Англійська мова (техн.)", "en": "English Language (Tech.)"}, "room": {"ua": "Ауд. 308", "en": "Aud. 308"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
            ],
            "wednesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Машинне навчання (лаб.)", "en": "Machine Learning (Lab)"}, "room": {"ua": "Лаб. 401", "en": "Lab. 401"}, "teacher": {"ua": "ст.викл. Лисенко А.Ю.", "en": "Sen.Lect. Lysenko A.Yu."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Комп'ютерні мережі (лаб.)", "en": "Computer Networks (Lab)"}, "room": {"ua": "Лаб. 312", "en": "Lab. 312"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Розробка ПЗ (практ.)", "en": "Software Development (Prac.)"}, "room": {"ua": "Лаб. 402", "en": "Lab. 402"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Захист інформації (лаб.)", "en": "Information Security (Lab)"}, "room": {"ua": "Лаб. 313", "en": "Lab. 313"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Практика з розробки ПЗ", "en": "Software Development Internship"}, "room": {"ua": "Лаб. 402", "en": "Lab. 402"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
            ],
        },
        {
            "group_id": kn32_id,
            "monday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Комп'ютерні мережі", "en": "Computer Networks"}, "room": {"ua": "Ауд. 313", "en": "Aud. 313"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Захист інформації", "en": "Information Security"}, "room": {"ua": "Ауд. 314", "en": "Aud. 314"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "tuesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Розробка ПЗ (Agile/Scrum)", "en": "Software Development (Agile/Scrum)"}, "room": {"ua": "Ауд. 402", "en": "Aud. 402"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Англійська мова (техн.)", "en": "English Language (Tech.)"}, "room": {"ua": "Ауд. 309", "en": "Aud. 309"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
            ],
            "wednesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Машинне навчання", "en": "Machine Learning"}, "room": {"ua": "Лаб. 403", "en": "Lab. 403"}, "teacher": {"ua": "ст.викл. Лисенко А.Ю.", "en": "Sen.Lect. Lysenko A.Yu."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Комп'ютерні мережі (лаб.)", "en": "Computer Networks (Lab)"}, "room": {"ua": "Лаб. 313", "en": "Lab. 313"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Захист інформації (лаб.)", "en": "Information Security (Lab)"}, "room": {"ua": "Лаб. 314", "en": "Lab. 314"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "thursday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Машинне навчання (лаб.)", "en": "Machine Learning (Lab)"}, "room": {"ua": "Лаб. 403", "en": "Lab. 403"}, "teacher": {"ua": "ст.викл. Лисенко А.Ю.", "en": "Sen.Lect. Lysenko A.Yu."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Розробка ПЗ (практ.)", "en": "Software Development (Prac.)"}, "room": {"ua": "Лаб. 403", "en": "Lab. 403"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
            ],
        },
        {
            "group_id": kn33_id,
            "monday": [
                {"time": "15:00 – 16:35", "subject": {"ua": "Машинне навчання", "en": "Machine Learning"}, "room": {"ua": "Лаб. 404", "en": "Lab. 404"}, "teacher": {"ua": "ст.викл. Лисенко А.Ю.", "en": "Sen.Lect. Lysenko A.Yu."}},
            ],
            "tuesday": [
                {"time": "13:00 – 14:35", "subject": {"ua": "Комп'ютерні мережі", "en": "Computer Networks"}, "room": {"ua": "Ауд. 315", "en": "Aud. 315"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "15:00 – 16:35", "subject": {"ua": "Захист інформації", "en": "Information Security"}, "room": {"ua": "Ауд. 315", "en": "Aud. 315"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "wednesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Розробка ПЗ (Agile/Scrum)", "en": "Software Development (Agile/Scrum)"}, "room": {"ua": "Ауд. 403", "en": "Aud. 403"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Англійська мова (техн.)", "en": "English Language (Tech.)"}, "room": {"ua": "Ауд. 310", "en": "Aud. 310"}, "teacher": {"ua": "викл. Семенова І.В.", "en": "Lect. Semenova I.V."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Комп'ютерні мережі (лаб.)", "en": "Computer Networks (Lab)"}, "room": {"ua": "Лаб. 315", "en": "Lab. 315"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Машинне навчання (лаб.)", "en": "Machine Learning (Lab)"}, "room": {"ua": "Лаб. 404", "en": "Lab. 404"}, "teacher": {"ua": "ст.викл. Лисенко А.Ю.", "en": "Sen.Lect. Lysenko A.Yu."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Захист інформації (лаб.)", "en": "Information Security (Lab)"}, "room": {"ua": "Лаб. 315", "en": "Lab. 315"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Розробка ПЗ (практ.)", "en": "Software Development (Prac.)"}, "room": {"ua": "Лаб. 404", "en": "Lab. 404"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
            ],
        },
        # ── КУРС 4 ──
        {
            "group_id": kn41_id,
            "monday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Архітектура програмних систем", "en": "Software Systems Architecture"}, "room": {"ua": "Ауд. 501", "en": "Aud. 501"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Хмарні технології", "en": "Cloud Technologies"}, "room": {"ua": "Лаб. 501", "en": "Lab. 501"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
            ],
            "tuesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Паралельні обчислення", "en": "Parallel Computing"}, "room": {"ua": "Лаб. 502", "en": "Lab. 502"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Дипломне проектування (конс.)", "en": "Diploma Design (Consultation)"}, "room": {"ua": "Ауд. 502", "en": "Aud. 502"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
            "wednesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Хмарні технології (лаб.)", "en": "Cloud Technologies (Lab)"}, "room": {"ua": "Лаб. 501", "en": "Lab. 501"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Архітектура ПС (практ.)", "en": "Software Architecture (Prac.)"}, "room": {"ua": "Лаб. 502", "en": "Lab. 502"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Паралельні обчислення (лаб.)", "en": "Parallel Computing (Lab)"}, "room": {"ua": "Лаб. 502", "en": "Lab. 502"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Дипломне проектування", "en": "Diploma Design"}, "room": {"ua": "Лаб. 503", "en": "Lab. 503"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
        },
        {
            "group_id": kn42_id,
            "monday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Хмарні технології", "en": "Cloud Technologies"}, "room": {"ua": "Лаб. 503", "en": "Lab. 503"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Паралельні обчислення", "en": "Parallel Computing"}, "room": {"ua": "Лаб. 504", "en": "Lab. 504"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
            ],
            "tuesday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Архітектура програмних систем", "en": "Software Systems Architecture"}, "room": {"ua": "Ауд. 503", "en": "Aud. 503"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Дипломне проектування (конс.)", "en": "Diploma Design (Consultation)"}, "room": {"ua": "Ауд. 503", "en": "Aud. 503"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
            "wednesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Паралельні обчислення (лаб.)", "en": "Parallel Computing (Lab)"}, "room": {"ua": "Лаб. 504", "en": "Lab. 504"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Хмарні технології (лаб.)", "en": "Cloud Technologies (Lab)"}, "room": {"ua": "Лаб. 503", "en": "Lab. 503"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Архітектура ПС (практ.)", "en": "Software Architecture (Prac.)"}, "room": {"ua": "Лаб. 503", "en": "Lab. 503"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "friday": [
                {"time": "10:20 – 11:55", "subject": {"ua": "Дипломне проектування", "en": "Diploma Design"}, "room": {"ua": "Лаб. 504", "en": "Lab. 504"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
        },
        {
            "group_id": kn43_id,
            "monday": [
                {"time": "15:00 – 16:35", "subject": {"ua": "Архітектура програмних систем", "en": "Software Systems Architecture"}, "room": {"ua": "Ауд. 504", "en": "Aud. 504"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "tuesday": [
                {"time": "15:00 – 16:35", "subject": {"ua": "Хмарні технології", "en": "Cloud Technologies"}, "room": {"ua": "Лаб. 505", "en": "Lab. 505"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
            ],
            "wednesday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Дипломне проектування (конс.)", "en": "Diploma Design (Consultation)"}, "room": {"ua": "Ауд. 504", "en": "Aud. 504"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Паралельні обчислення", "en": "Parallel Computing"}, "room": {"ua": "Лаб. 505", "en": "Lab. 505"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
                {"time": "13:00 – 14:35", "subject": {"ua": "Архітектура ПС (практ.)", "en": "Software Architecture (Prac.)"}, "room": {"ua": "Лаб. 505", "en": "Lab. 505"}, "teacher": {"ua": "проф. Коваленко М.С.", "en": "Prof. Kovalenko M.S."}},
            ],
            "thursday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Хмарні технології (лаб.)", "en": "Cloud Technologies (Lab)"}, "room": {"ua": "Лаб. 505", "en": "Lab. 505"}, "teacher": {"ua": "проф. Шевченко О.П.", "en": "Prof. Shevchenko O.P."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Паралельні обчислення (лаб.)", "en": "Parallel Computing (Lab)"}, "room": {"ua": "Лаб. 505", "en": "Lab. 505"}, "teacher": {"ua": "доц. Мельник О.І.", "en": "Assoc.Prof. Melnyk O.I."}},
            ],
            "friday": [
                {"time": "08:30 – 10:05", "subject": {"ua": "Фізичне виховання", "en": "Physical Education"}, "room": {"ua": "Спортзал", "en": "Gym"}, "teacher": {"ua": "викл. Гриценко В.А.", "en": "Lect. Hrytsenko V.A."}},
                {"time": "10:20 – 11:55", "subject": {"ua": "Дипломне проектування", "en": "Diploma Design"}, "room": {"ua": "Лаб. 506", "en": "Lab. 506"}, "teacher": {"ua": "проф. Петренко І.О.", "en": "Prof. Petrenko I.O."}},
            ],
        },
    ]
    await db.group_schedules.insert_many(schedules)

    return {"message": "Seeded", "staff": len(staff_data), "news": len(news_data), "labs": len(labs_data), "projects": len(proj_data)}

# ══ FILL RANDOM ELECTIVES ══
ELECTIVE_BLOCKS_BY_COURSE = {
    1: [
        ["Аналіз даних та програмні системи", "Розробка ігрових додатків на Unity"],
        ["Основи кібербезпеки", "Хмарні обчислення (AWS/Azure)"],
    ],
    2: [
        ["Машинне навчання та нейронні мережі", "Big Data аналітика"],
        ["Управління IT-проектами (Agile/Scrum)", "Тестування та QA"],
    ],
    3: [
        ["Архітектура мікросервісів", "Blockchain та Web3 розробка"],
        ["Підприємництво в IT", "DevSecOps та автоматизація"],
    ],
}

@api_router.post("/seed-electives", 
    summary="Призначити випадкові вибіркові студентам",
    description="Рандомно призначає вибіркові дисципліни всім підтвердженим студентам. Тільки для розробки.",
)
async def seed_electives():
    import random
    students = await db.users.find(
        {
            "role": "student",
            "is_approved": True,
            "is_seeded": True,
            "electives_submitted_at": {"$exists": False}
        },
        {"_id": 0, "id": 1, "course": 1}
    ).to_list(None)

    count = 0
    for s in students:
        course = s.get("course", 1)
        blocks = ELECTIVE_BLOCKS_BY_COURSE.get(course, ELECTIVE_BLOCKS_BY_COURSE[1])
        selections = [random.choice(block) for block in blocks]
        await db.users.update_one(
            {"id": s["id"]},
            {"$set": {
                "elective_selections": selections,
                "electives_submitted_at": datetime.utcnow().isoformat()
            }}
        )
        count += 1

    return {"message": f"Вибіркові дисципліни призначено {count} студентам", "count": count}

# ══════════════ STUDENT PROFILE ══════════════

@api_router.get("/student/me", 
    summary="Профіль студента",
    description="**token** — токен студента. Повертає повний профіль включно з інфо про куратора.",
)
async def get_student_me(token: str = Query(...), lang: str = Query("ua")):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    if user.get("group_id"):
        grp = await db.study_groups.find_one({"id": user["group_id"]}, {"_id": 0})
        if grp and grp.get("curator_staff_id"):
            user = {**user, "curator_staff_id": grp["curator_staff_id"], "curator_name": grp.get("curator_name")}

    curator_staff_id = user.get("curator_staff_id")
    if curator_staff_id:
        curator_user = await db.users.find_one(
            {"staff_id": curator_staff_id, "is_approved": True},
            {"_id": 0, "email": 1, "phone": 1}
        )
        user = {**user,
            "curator_email": curator_user["email"] if curator_user else None,
            "curator_phone": curator_user.get("phone") if curator_user else None,
        }

    return localize(user, lang)


@api_router.put("/student/contacts", summary="Оновити контакти студента",
    description=(
        "**token** — токен студента.\n\n"
        "Body: `{\"email\": \"новий@email.com\", \"phone\": \"+380501234567\"}`"
    ),
)
async def update_student_contacts(req: UpdateContactsRequest, token: str = Query(...), lang: str = Query("ua")):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")

    update = {}

    if req.email:
        new_email = req.email.lower().strip()
        current_user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "email": 1})
        if current_user and current_user.get("email") != new_email:
            existing = await db.users.find_one({"email": new_email, "id": {"$ne": session["user_id"]}})
            if existing:
                raise HTTPException(status_code=409, detail="Ця електронна пошта вже використовується іншим акаунтом")
        update["email"] = new_email
        update["contact_email"] = new_email

    update["phone"] = req.phone.strip() if req.phone and req.phone.strip() else None

    if update:
        await db.users.update_one({"id": session["user_id"]}, {"$set": update})

    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "hashed_password": 0})

    curator_staff_id = user.get("curator_staff_id")
    if curator_staff_id:
        curator_user = await db.users.find_one(
            {"staff_id": curator_staff_id, "is_approved": True},
            {"_id": 0, "email": 1, "phone": 1}
        )
        user = {**user,
            "curator_email": curator_user["email"] if curator_user else None,
            "curator_phone": curator_user.get("phone") if curator_user else None,
        }

    return localize(user, lang)

# ══════════════ EXAM SCHEDULE ══════════════

@api_router.get("/student/exam-schedule", 
    summary="Розклад іспитів студента",
    description=(
        "**token** — сесійний токен студента (з `POST /api/auth/login`).\n\n"
        "Автоматично знаходить групу студента та повертає її розклад іспитів.\n\n"
        "Як отримати токен: увійдіть через `/auth/login`, скопіюйте поле `token` з відповіді."
    ),
)
async def get_exam_schedule(token: str = Query(...), lang: str = Query("ua")):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user or not user.get("group_id"):
        return {"exams": []}
    doc = await db.exam_schedules.find_one(
        {"group_id": user["group_id"]}, {"_id": 0}
    )
    exams = doc.get("exams", []) if doc else []
    return {"exams": [localize(e, lang) for e in exams]}


@api_router.put("/admin/exam-schedule/{group_id}", 
    summary="Оновити розклад іспитів групи (адмін)",
    description=(
        "🔒 **Тільки адмін.**\n\n"
        "**group_id** — UUID групи (поле `id` з `study_groups`). Отримати: `GET /api/groups`.\n\n"
        "**token** — токен адміна.\n\n"
        "Body: `{\"exams\": [{\"subject\": \"Математика\", \"exam_date\": \"2025-06-15\", "
        "\"exam_time\": \"09:00\", \"consultation_date\": \"2025-06-13\", "
        "\"consultation_time\": \"14:00\", \"staff_name\": \"Іванов Д.С.\"}]}`"
    ),
)
async def update_exam_schedule(group_id: str, data: dict, token: str = Query(...)):
    await require_admin(token)
    exams = data.get("exams", [])
    for e in exams:
        if not e.get("id"):
            e["id"] = str(uuid.uuid4())
    await db.exam_schedules.update_one(
        {"group_id": group_id},
        {"$set": {"group_id": group_id, "exams": exams}},
        upsert=True
    )
    return {"group_id": group_id, "exams": exams}

@api_router.put("/student/password", 
    summary="Змінити пароль студента",
    description=(
        "**token** — токен студента.\n\n"
        "Body: `{\"current_password\": \"поточний\", \"new_password\": \"новий\"}`"
    ),
)
async def change_student_password(req: ChangePasswordRequest, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]})
    if not user or not user.get("hashed_password"):
        raise HTTPException(status_code=404, detail="Не знайдено")
    if not pwd_context.verify(req.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Поточний пароль невірний")
    new_hash = pwd_context.hash(req.new_password)
    await db.users.update_one({"id": session["user_id"]}, {"$set": {"hashed_password": new_hash}})
    return {"message": "Пароль змінено"}


@api_router.post("/student/electives", 
    summary="Зберегти вибір вибіркових дисциплін",
    description=(
        "**token** — токен студента.\n\n"
        "Body: `{\"selected_disciplines\": [\"Назва дисципліни 1\", \"Назва дисципліни 2\"]}`"
    ),
)
async def submit_student_electives(data: dict, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user or user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Доступ заборонено")

    selections = data.get("selected_disciplines", [])
    await db.users.update_one(
        {"id": session["user_id"]},
        {"$set": {"elective_selections": selections, "electives_submitted_at": datetime.utcnow().isoformat()}}
    )
    return {"message": "Вибір збережено", "selected": selections}


@api_router.get("/student/electives", 
    summary="Переглянути вибрані дисципліни",
    description="**token** — токен студента.",
)
async def get_student_electives(token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")
    return {
        "selected_disciplines": user.get("elective_selections", []),
        "submitted_at": user.get("electives_submitted_at"),
    }


@api_router.get("/student/education-schedule", 
    summary="Графік навчального процесу (для студента)",
    description=(
        "Повертає опублікований адміном графік навчального процесу (файл base64).\n\n"
        "Публічний ендпоїнт, токен не потрібен.\n\n"
        "Якщо адмін ще не опублікував графік — повертає `{\"published\": false}`."
    ),
)
async def get_education_schedule():
    doc = await db.schedule_config.find_one({}, {"_id": 0})
    if not doc or not doc.get("published"):
        return {"published": False, "url": None, "filename": None}
    return doc


@api_router.get("/student/schedule/{group_id}", 
    summary="Тижневий розклад групи",
    description=(
        "**group_id** — UUID групи (поле `id` з `study_groups`). "
        "Отримати: `GET /api/groups`.\n\n"
        "Публічний ендпоїнт, токен не потрібен."
    ),
)
async def get_group_schedule(group_id: str, lang: str = Query("ua")):
    doc = await db.group_schedules.find_one({"group_id": group_id}, {"_id": 0})
    if not doc:
        return {"group_id": group_id, "monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": []}
    return localize(doc, lang)


@api_router.get("/announcements", 
    summary="Оголошення",
    description=(
        "Повертає оголошення видимі для конкретного користувача.\n\n"
        "**role** — роль: `students`, `staff` або `all`.\n\n"
        "**group_id** — UUID групи для фільтрації оголошень конкретній групі.\n\n"
        "**user_id** — UUID користувача (поле `id` з `users`) для отримання персональних повідомлень.\n\n"
        "Якщо не передати жодного параметра — повертає всі оголошення."
    ),
)
async def get_announcements(
    group_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    lang: str = Query("ua"),
):
    visibility = []

    if role:
        visibility.append({"target_role": role})
        visibility.append({"target_role": "all"})
        visibility.append({"from_admin": {"$ne": True}})

    if user_id:
        visibility.append({"target_user_id": user_id})

    if not visibility:
        base_query = {}
    else:
        base_query = {"$or": visibility}

    if group_id:
        group_condition = {
            "$or": [
                {"target_groups": {"$size": 0}},
                {"target_groups": group_id},
                {"target_user_id": {"$exists": True}},
            ]
        }
        final_query = {"$and": [base_query, group_condition]} if base_query else group_condition
    else:
        final_query = base_query

    items = await db.announcements.find(final_query, {"_id": 0}).sort("_id", -1).to_list(100)
    return [localize(item, lang) for item in items]

# ══════════════ STAFF PROFILE ENDPOINTS ══════════════
 
@api_router.get("/staff-profile/me", 
    summary="Профіль викладача (особистий кабінет)",
    description="**token** — токен викладача. Повертає профіль з прив'язкою до публічного запису `staff` та лабораторії."
)
async def get_staff_profile_me(token: str = Query(...), lang: str = Query("ua")):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")

    staff_record = None
    if user.get("staff_id"):
        staff_record = await db.staff.find_one({"id": user["staff_id"]}, {"_id": 0})
    if not staff_record and user.get("email"):
        staff_record = await db.staff.find_one({"email": user["email"]}, {"_id": 0})
        if staff_record:
            await db.users.update_one({"id": session["user_id"]}, {"$set": {"staff_id": staff_record["id"]}})

    if staff_record:
        lab = await db.laboratories.find_one(
            {"$or": [{"head_staff_id": staff_record["id"]}, {"team_member_ids": staff_record["id"]}]},
            {"_id": 0, "name": 1, "id": 1}
        )
        staff_record["lab_name"] = lab["name"] if lab else None
        staff_record["lab_id"] = lab["id"] if lab else None
        
        projects = await db.lab_projects.find(
            {"coordinator_ids": staff_record["id"]}, {"_id": 0, "name": 1}
        ).to_list(10)
        staff_record["project_names"] = [p["name"] for p in projects]

    merged = {**user, **(staff_record or {})}
    return localize(merged, lang)

@api_router.post("/staff-profile/photo", 
    summary="Оновити фото викладача",
    description="**token** — токен викладача. Body: {\"photo_data\": \"data:image/jpeg;base64,...\"}"
)
async def update_staff_photo(data: dict, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")
    photo_data = data.get("photo_data", "")
    await db.users.update_one({"id": session["user_id"]}, {"$set": {"photo_url": photo_data}})
    staff_id = user.get("staff_id")
    if staff_id:
        await db.staff.update_one({"id": staff_id}, {"$set": {"photo_url": photo_data}})
    elif user.get("email"):
        await db.staff.update_one({"email": user["email"]}, {"$set": {"photo_url": photo_data}})
    return {"message": "Фото оновлено", "photo_url": photo_data}

@api_router.post("/student/photo", 
    summary="Оновити фото студента",
    description=(
        "**token** — токен студента.\n\n"
        "Body: `{\"photo_data\": \"data:image/jpeg;base64,...\"}`"
    ),
)
async def update_student_photo(data: dict, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user or user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    photo_data = data.get("photo_data", "")
    await db.users.update_one({"id": session["user_id"]}, {"$set": {"photo_url": photo_data}})
    return {"message": "Фото оновлено", "photo_url": photo_data}

@api_router.put("/staff-profile/contacts", 
    summary="Оновити контакти викладача",
    description="**token** — токен викладача. Body: {\"email\": \"новий@email.com\", \"phone\": \"+380...\"}"
)
async def update_staff_contacts(req: UpdateContactsRequest, token: str = Query(...), lang: str = Query("ua")):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")

    update_user = {}
    old_email = user.get("email", "")

    if req.email:
        new_email = req.email.lower().strip()
        if new_email != old_email:
            # Check uniqueness
            existing = await db.users.find_one({"email": new_email, "id": {"$ne": session["user_id"]}})
            if existing:
                raise HTTPException(status_code=409, detail="Ця електронна пошта вже використовується іншим акаунтом")
        update_user["email"] = new_email
        update_user["contact_email"] = new_email

    update_user["phone"] = req.phone.strip() if req.phone and req.phone.strip() else None

    if update_user:
        await db.users.update_one({"id": session["user_id"]}, {"$set": update_user})
        if "email" in update_user and old_email:
            await db.staff.update_one({"email": old_email}, {"$set": {"email": update_user["email"]}})

    updated_user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "hashed_password": 0})
    return localize(updated_user, lang)
 
 
@api_router.put("/staff-profile/password", 
    summary="Змінити пароль викладача",
    description="**token** — токен викладача. Body: {\"current_password\": \"...\", \"new_password\": \"...\"}"
)
async def change_staff_password(req: ChangePasswordRequest, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]})
    if not user or not user.get("hashed_password"):
        raise HTTPException(status_code=404, detail="Не знайдено")
    if not pwd_context.verify(req.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Поточний пароль невірний")
    await db.users.update_one({"id": session["user_id"]}, {"$set": {"hashed_password": pwd_context.hash(req.new_password)}})
    return {"message": "Пароль змінено"}
 
 
@api_router.post("/staff-profile/publications", 
    summary="Додати публікацію",
    description="**token** — токен викладача. Body: JSON з полями публікації (name, date, pub_type тощо). Опційно: file_data (base64 PDF)."
)
async def add_staff_publication(data: dict, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")

    file_id = None
    file_data_b64 = data.pop("file_data", None)
    if file_data_b64:
        if "," in file_data_b64:
            file_data_b64 = file_data_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(file_data_b64)
        file_id = await fs.upload_from_stream(
            data.get("name", "publication"),
            file_bytes,
            metadata={"uploader": user.get("email"), "type": "publication"}
        )
        file_id = str(file_id)

    pub = {**data, "id": str(uuid.uuid4()), "file_id": file_id, "uploaded_at": datetime.utcnow().isoformat()}
    staff_query = {"id": user["staff_id"]} if user.get("staff_id") else {"email": user.get("email")}
    await db.staff.update_one(staff_query, {"$push": {"publications": pub}})
    return pub

# @api_router.post("/staff-profile/publications")
# async def add_staff_publication(data: dict, token: str = Query(...)):
#     session = await db.sessions.find_one({"token": token})
#     if not session:
#         raise HTTPException(status_code=401, detail="Недійсний токен")
#     user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
#     if not user:
#         raise HTTPException(status_code=404, detail="Не знайдено")
#     pub = {**data, "id": str(uuid.uuid4()), "uploaded_at": datetime.utcnow().isoformat()}
#     if user.get("email"):
#         await db.staff.update_one({"email": user["email"]}, {"$push": {"publications": pub}})
#     return pub
 
 
@api_router.put("/staff-profile/publications/{pub_id}", 
    summary="Оновити публікацію",
    description="**pub_id** — UUID публікації (поле `id` всередині масиву publications викладача). **token** — токен викладача."
)
async def update_staff_publication(pub_id: str, data: dict, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")
    if user.get("staff_id") or user.get("email"):
        staff_filter = {"id": user["staff_id"]} if user.get("staff_id") else {"email": user.get("email")}
        staff_filter["publications.id"] = pub_id
        await db.staff.update_one(
            staff_filter,
            {"$set": {f"publications.$.{k}": v for k, v in data.items()}}
        )
    return {"message": "Оновлено"}
 
 
@api_router.delete("/staff-profile/publications/{pub_id}", 
    summary="Видалити публікацію",
    description="**pub_id** — UUID публікації. **token** — токен викладача."
)
async def delete_staff_publication(pub_id: str, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")
    if user.get("email"):
        staff_query = {"id": user["staff_id"]} if user.get("staff_id") else {"email": user.get("email")}
        await db.staff.update_one(staff_query, {"$pull": {"publications": {"id": pub_id}}})
    return {"message": "Видалено"}
 
 
@api_router.post("/staff-profile/certificates", 
    summary="Додати сертифікат",
    description="**token** — токен викладача. Body: JSON з полями сертифіката (name, date, issuer тощо). Опційно: file_data (base64 PDF)."
)
async def add_staff_certificate(data: dict, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")

    file_id = None
    file_data_b64 = data.pop("file_data", None)
    if file_data_b64:
        if "," in file_data_b64:
            file_data_b64 = file_data_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(file_data_b64)
        file_id = await fs.upload_from_stream(
            data.get("name", "certificate"),
            file_bytes,
            metadata={"uploader": user.get("email"), "type": "certificate"}
        )
        file_id = str(file_id)

    cert = {**data, "id": str(uuid.uuid4()), "file_id": file_id, "uploaded_at": datetime.utcnow().isoformat()}
    staff_query = {"id": user["staff_id"]} if user.get("staff_id") else {"email": user.get("email")}
    await db.staff.update_one(staff_query, {"$push": {"certificates": cert}})
    return cert

# @api_router.post("/staff-profile/certificates")
# async def add_staff_certificate(data: dict, token: str = Query(...)):
#     session = await db.sessions.find_one({"token": token})
#     if not session:
#         raise HTTPException(status_code=401, detail="Недійсний токен")
#     user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
#     if not user:
#         raise HTTPException(status_code=404, detail="Не знайдено")
#     cert = {**data, "id": str(uuid.uuid4()), "uploaded_at": datetime.utcnow().isoformat()}
#     if user.get("email"):
#         await db.staff.update_one({"email": user["email"]}, {"$push": {"certificates": cert}})
#     return cert
 
@api_router.put("/staff-profile/certificates/{cert_id}", 
    summary="Оновити сертифікат",
    description="**cert_id** — UUID сертифіката (поле `id` всередині масиву certificates викладача). **token** — токен викладача."
)
async def update_staff_certificate(cert_id: str, data: dict, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")
    if user.get("email"):
        await db.staff.update_one(
            {"email": user["email"], "certificates.id": cert_id},
            {"$set": {f"certificates.$.{k}": v for k, v in data.items()}}
        )
    return {"message": "Оновлено"}

@api_router.delete("/staff-profile/certificates/{cert_id}", 
    summary="Видалити сертифікат",
    description="**cert_id** — UUID сертифіката (поле `id` всередині масиву certificates викладача). **token** — токен викладача."
)
async def delete_staff_certificate(cert_id: str, token: str = Query(...)):
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Не знайдено")
    if user.get("email"):
        await db.staff.update_one({"email": user["email"]}, {"$pull": {"certificates": {"id": cert_id}}})
    return {"message": "Видалено"}

@api_router.get("/staff-profile/file/{file_id}", 
    summary="Завантажити файл публікації/сертифіката",
    description=(
        "**file_id** — MongoDB ObjectId файлу (поле `file_id` у записі публікації або сертифіката). "
        "Це стандартний MongoDB ObjectId (24-символьний hex рядок), НЕ UUID.\n\n"
        "**token** — токен викладача, якому належить файл."
    ),
)
async def download_staff_file(file_id: str, token: str = Query(...)):
    import io
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    try:
        grid_out = await fs.open_download_stream(ObjectId(file_id))
        data = await grid_out.read()
        filename = grid_out.filename or "file"
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=\"file\""}
        )
    except Exception as e:
        logger.error(f"GridFS download error for file_id={file_id}: {e}")
        raise HTTPException(status_code=404, detail=f"Файл не знайдено: {str(e)}")

@app.on_event("startup")
async def startup_event():
    count = await db.staff.count_documents({})
    lab_count = await db.laboratories.count_documents({})
    student_count = await db.users.count_documents({"email": "student@gmail.com"})
    admin_count = await db.users.count_documents({"email": "admin@gmail.com"})
    if count == 0 or lab_count == 0 or student_count == 0 or admin_count == 0:
        await seed_database()
        logger.info("Database auto-seeded on startup")


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()