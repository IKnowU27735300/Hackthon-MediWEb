from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, database, schemas
import datetime
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MediWeb")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "MediWeb API is running"}

# Onboarding Flow APIs

@app.post("/onboarding/workspace", response_model=schemas.Business)
def create_workspace(business: schemas.BusinessCreate, db: Session = Depends(database.get_db)):
    db_business = models.Business(**business.dict())
    db.add(db_business)
    db.commit()
    db.refresh(db_business)
    return db_business

@app.post("/onboarding/services", response_model=schemas.Business)
def setup_services(business_id: int, services_active: schemas.ServiceSetup, db: Session = Depends(database.get_db)):
    db_business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if not db_business:
        raise HTTPException(status_code=404, detail="Business not found")
    db_business.sms_service_active = services_active.sms_active
    db_business.email_service_active = services_active.email_active
    db_business.onboarding_step = 2
    db.commit()
    db.refresh(db_business)
    return db_business

@app.get("/onboarding/status/{business_id}")
def get_onboarding_status(business_id: int, db: Session = Depends(database.get_db)):
    db_business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if not db_business:
        raise HTTPException(status_code=404, detail="Business not found")
    return {"step": db_business.onboarding_step, "is_active": db_business.is_active}

# Dashboard Data

@app.get("/dashboard/{business_id}")
def get_dashboard_summary(business_id: int, db: Session = Depends(database.get_db)):
    bookings = db.query(models.Booking).filter(models.Booking.business_id == business_id).all()
    contacts = db.query(models.Contact).filter(models.Contact.business_id == business_id).all()
    inventory = db.query(models.Inventory).filter(models.Inventory.business_id == business_id).all()
    
    return {
        "bookings": {
            "today": len([b for b in bookings if b.start_time.date() == datetime.date.today()]),
            "upcoming": len([b for b in bookings if b.start_time.date() > datetime.date.today()]),
            "completed": len([b for b in bookings if b.status == "completed"]),
            "no_show": len([b for b in bookings if b.status == "no-show"]),
        },
        "leads": {
            "total": len(contacts),
            "new": len([c for c in contacts if (datetime.datetime.utcnow() - c.created_at).days < 1])
        },
        "inventory_alerts": [
            {"name": i.name, "quantity": i.quantity, "threshold": i.threshold} 
            for i in inventory if i.quantity <= i.threshold
        ]
    }

@app.post("/inventory/{business_id}")
def update_inventory(business_id: int, name: str, quantity: int, threshold: int, db: Session = Depends(database.get_db)):
    item = db.query(models.Inventory).filter(models.Inventory.business_id == business_id, models.Inventory.name == name).first()
    if item:
        item.quantity = quantity
        item.threshold = threshold
    else:
        item = models.Inventory(business_id=business_id, name=name, quantity=quantity, threshold=threshold)
        db.add(item)
    db.commit()
    return {"status": "success"}

@app.post("/contacts/form-submit")
def submit_contact_form(contact: schemas.ContactCreate, db: Session = Depends(database.get_db)):
    db_contact = models.Contact(**contact.dict())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    
    # Trigger automation
    import automation
    automation.trigger_automation("NEW_CONTACT", contact.business_id, db_contact.id, db)
    
    return db_contact

@app.post("/onboarding/activate/{business_id}")
def activate_workspace(business_id: int, db: Session = Depends(database.get_db)):
    db_business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if not db_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Step 8 Validation:
    # 1. Email/SMS channels connected
    if not (db_business.email_service_active or db_business.sms_service_active):
        raise HTTPException(status_code=400, detail="At least one communication channel must be active")
    
    # 2. At least one booking type defined
    if db_business.onboarding_step < 2:
        raise HTTPException(status_code=400, detail="Services and availability must be configured")
        
    db_business.is_active = True
    db.commit()
    return {"status": "activated", "is_active": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
