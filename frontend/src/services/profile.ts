import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function updateDoctorProfile(businessId: string, profileData: {
  publicName: string;
  phone: string;
  location: string;
  doctorName?: string;
  licenseNumber?: string;
}) {
  try {
    const businessRef = doc(db, 'businesses', businessId);
    await updateDoc(businessRef, {
      displayName: profileData.publicName,
      businessPhone: profileData.phone,
      location: profileData.location,
      ...(profileData.doctorName && { doctorName: profileData.doctorName }),
      ...(profileData.licenseNumber && { licenseNumber: profileData.licenseNumber }),
      profileCompleted: true,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}
