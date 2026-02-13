from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BusinessBase(BaseModel):
    name: str
    address: Optional[str] = None
    timezone: str = "UTC"
    email: str

class BusinessCreate(BusinessBase):
    pass

class Business(BusinessBase):
    id: int
    sms_service_active: bool
    email_service_active: bool
    is_active: bool
    onboarding_step: int

    class Config:
        orm_mode = True

class ServiceSetup(BaseModel):
    sms_active: bool
    email_active: bool

class ContactBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    source: str

class ContactCreate(ContactBase):
    business_id: int

class Contact(ContactBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class BookingBase(BaseModel):
    service_name: str
    start_time: datetime
    duration_minutes: int
    location: Optional[str] = None

class BookingCreate(BookingBase):
    business_id: int
    contact_id: int

class Booking(BookingBase):
    id: int
    status: str

    class Config:
        orm_mode = True
