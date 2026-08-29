// Modal Elements
const modal = document.getElementById("bookingModal");
const closeBtn = document.querySelector(".close-btn");
const orderButtons = document.querySelectorAll(".btn-order");
const selectedServiceInput = document.getElementById("selectedService");

// Dynamic Booking Data Implementation
orderButtons.forEach(button => {
    button.addEventListener("click", (e) => {
        const serviceName = e.target.getAttribute("data-service");
        selectedServiceInput.value = "সার্ভিস: " + serviceName;
        modal.style.display = "flex";
    });
});

// Close Modal
closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Form Submission
document.getElementById("orderForm").addEventListener("submit", (e) => {
    e.preventDefault();
    alert(ধন্যবাদ! আপনার ${selectedServiceInput.value}-এর বুকিং সফল হয়েছে।);
    modal.style.display = "none";
});

// Search Filter Implementation
const searchInput = document.getElementById("searchInput");
const serviceCards = document.querySelectorAll(".service-card");

function filterServices() {
    const query = searchInput.value.toLowerCase().trim();
    
    serviceCards.forEach(card => {
        const serviceData = card.getAttribute("data-name").toLowerCase();
        if (serviceData.includes(query)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// Event Listeners for Live Search
searchInput.addEventListener("keyup", filterServices);
document.getElementById("searchBtn").addEventListener("click", filterServices);