from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON, Text, Float
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Business(Base):
    __tablename__ = "businesses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String, nullable=True)
    timezone = Column(String, default="UTC")
    email = Column(String, unique=True, index=True)
    sms_service_active = Column(Boolean, default=False)
    email_service_active = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=1)
    
    contacts = relationship("Contact", back_populates="business")
    bookings = relationship("Booking", back_populates="business")
    inventory = relationship("Inventory", back_populates="business")
    staff = relationship("Staff", back_populates="business")

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"))
    name = Column(String)
    email = Column(String)
    phone = Column(String, nullable=True)
    source = Column(String) # 'form' or 'booking'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    business = relationship("Business", back_populates="contacts")
    bookings = relationship("Booking", back_populates="contact")
    form_submissions = relationship("FormSubmission", back_populates="contact")

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    service_name = Column(String)
    start_time = Column(DateTime)
    duration_minutes = Column(Integer)
    status = Column(String, default="confirmed") # confirmed, completed, no-show, cancelled
    location = Column(String, nullable=True)
    
    business = relationship("Business", back_populates="bookings")
    contact = relationship("Contact", back_populates="bookings")
    form_submissions = relationship("FormSubmission", back_populates="booking")

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"))
    name = Column(String)
    quantity = Column(Integer)
    threshold = Column(Integer)
    
    business = relationship("Business", back_populates="inventory")

class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"))
    name = Column(String)
    email = Column(String, unique=True)
    role = Column(String) # owner, staff
    permissions = Column(JSON) # e.g. {"bookings": "edit", "forms": "edit", "inventory": "view"}

    business = relationship("Business", back_populates="staff")

class Form(Base):
    __tablename__ = "forms"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"))
    name = Column(String)
    type = Column(String) # intake, agreement
    config = Column(JSON) # fields definition

class FormSubmission(Base):
    __tablename__ = "form_submissions"
    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    data = Column(JSON)
    status = Column(String, default="pending") # pending, completed
    submitted_at = Column(DateTime, nullable=True)

    contact = relationship("Contact", back_populates="form_submissions")
    booking = relationship("Booking", back_populates="form_submissions")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    last_message = Column(Text)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_type = Column(String) # staff, customer
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    channel = Column(String) # email, sms
