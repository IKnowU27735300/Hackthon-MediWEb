import datetime
import models
from sqlalchemy.orm import Session

def trigger_automation(event_type: str, business_id: int, contact_id: int, db: Session, booking_id: int = None):
    """
    Core Automation Engine: Event-based triggers
    """
    business = db.query(models.Business).filter(models.Business.id == business_id).first()
    contact = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    
    if not business or not contact:
        return

    if event_type == "NEW_CONTACT":
        # New contact -> welcome message
        send_message(
            business, 
            contact, 
            "Welcome! Thank you for contacting us. How can we help you today?",
            db
        )

    elif event_type == "BOOKING_CREATED":
        # Booking created -> confirmation
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if booking:
            msg = f"Confirmed! Your booking for {booking.service_name} is set for {booking.start_time.strftime('%b %d at %H:%M')}."
            send_message(business, contact, msg, db)
            
            # Post-booking forms auto-sent
            send_forms(business, contact, booking, db)

    elif event_type == "FORM_PENDING_REMINDER":
        # Pending form -> reminder (every 12h logic would be in a cron)
        send_message(
            business, 
            contact, 
            "Friendly reminder: Please complete your intake form before your appointment.",
            db
        )

def send_message(business, contact, content, db):
    # Log the message
    new_msg = models.Message(
        sender_type="system",
        content=content,
        channel="email" if business.email_service_active else "sms"
    )
    # Logic to actually call SendGrid/Twilio would go here
    print(f"[{business.name}] Sending to {contact.name}: {content}")
    # Update conversation
    pass

def send_forms(business, contact, booking, db):
    # Logic to create FormSubmission entries and send links
    pass

def check_inventory_thresholds(business_id: int, db: Session):
    items = db.query(models.Inventory).filter(
        models.Inventory.business_id == business_id,
        models.Inventory.quantity <= models.Inventory.threshold
    ).all()
    
    for item in items:
        # Create alert/notification
        print(f"ALERT: Low stock for {item.name}")
