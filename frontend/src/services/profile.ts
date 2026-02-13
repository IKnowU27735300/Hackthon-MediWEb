import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function updateDoctorProfile(businessId: string, profileData: {
  publicName: string;
  phone: string;
  location: string;
}) {
  try {
    const businessRef = doc(db, 'businesses', businessId);
    await updateDoc(businessRef, {
      displayName: profileData.publicName,
      businessPhone: profileData.phone,
      location: profileData.location,
      profileCompleted: true,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}
