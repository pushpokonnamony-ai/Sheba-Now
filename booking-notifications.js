export async function updateBookingWithNotifications(database, orderId, changes) {
  const { db, get, push, ref, update } = database;
  const orderSnapshot = await get(ref(db, `orders/${orderId}`));
  if (!orderSnapshot.exists()) throw new Error("বুকিংটি খুঁজে পাওয়া যায়নি।");

  const order = orderSnapshot.val() || {};
  const bookingReference = order.customId || orderId;
  const notifications = [];

  if (changes.paymentStatus === "অনুমোদিত" && order.paymentStatus !== "অনুমোদিত") {
    notifications.push({
      title: "Payment approved",
      message: `Your payment for booking #${bookingReference} has been approved!`,
      type: "payment_approved"
    });
  }
  if (String(changes.status || "").toLowerCase().includes("completed") &&
      !String(order.status || "").toLowerCase().includes("completed")) {
    notifications.push({
      title: "Booking completed",
      message: `Your service booking #${bookingReference} has been marked as Completed. Thank you for choosing ShebaNow!`,
      type: "booking_completed"
    });
  }

  const updates = {};
  Object.entries(changes).forEach(([field, value]) => {
    updates[`orders/${orderId}/${field}`] = value;
  });

  if (notifications.length && order.userId) {
    notifications.forEach((notification) => {
      const notificationRef = push(ref(db, `users/${order.userId}/notifications`));
      updates[`users/${order.userId}/notifications/${notificationRef.key}`] = {
        ...notification,
        user_id: order.userId,
        is_read: false,
        booking_id: orderId,
        booking_reference: String(bookingReference),
        created_at: Date.now()
      };
    });
  } else if (notifications.length) {
    console.error("Booking notification skipped because booking has no userId:", orderId);
  }

  await update(ref(db), updates);
  return { notificationsSent: Boolean(order.userId && notifications.length), notificationCount: notifications.length };
}
