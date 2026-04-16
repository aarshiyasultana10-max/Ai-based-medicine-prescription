// ===============================
// 💊 AI Medicine Chatbot Script
// ===============================

// ✅ Select elements
const chatForm = document.getElementById('chat-form');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const logoutBtn = document.getElementById('logout');

// ✅ Global variables
let dataset = [];
let currentSymptom = null;
let waitingForAge = false;
let waitingForQuantity = false;
let waitingForAllergyType = false;
let waitingForConfirmation = false;
let currentMedicine = null;
let detectedAgeGroup = null;
let allergyType = null;

// ✅ Load Excel Dataset
async function loadExcelDataset() {
  try {
    const response = await fetch('AI_Medicine_Ultimate_Dataset_200plus.xlsx'); // your dataset file
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    dataset = XLSX.utils.sheet_to_json(sheet);
    console.log("✅ Dataset loaded successfully:", dataset.length, "rows");
  } catch (error) {
    console.error("❌ Error loading dataset:", error);
  }
}
loadExcelDataset();

// ✅ Function to append chat messages
function appendMessage(text, sender) {
  const msg = document.createElement('div');
  msg.classList.add(sender === 'bot' ? 'bot-message' : 'user-message');
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ Main Chat Logic
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim().toLowerCase();
  if (!text) return;

  appendMessage(text, 'user');
  userInput.value = '';

  // -----------------------
  // 🧠 Step 1: Handle Allergy Type
  // -----------------------
  if (waitingForAllergyType && currentSymptom === "allergy") {
    allergyType = text.includes("dust") ? "dust" :
                  text.includes("food") ? "food" :
                  text.includes("skin") ? "skin" : null;

    if (!allergyType) {
      appendMessage("⚠️ Please specify the type of allergy — dust, food, or skin.", "bot");
      return;
    }

    appendMessage(`🧠 Got it! You have a ${allergyType} allergy.`, "bot");
    appendMessage("👶 Please enter the age (in years) of the person:", "bot");
    waitingForAllergyType = false;
    waitingForAge = true;
    return;
  }

  // -----------------------
  // 👶 Step 2: Handle Age Input
  // -----------------------
  if (waitingForAge && currentSymptom) {
    const age = parseInt(text);
    if (isNaN(age) || age <= 0) {
      appendMessage("⚠️ Please enter a valid numeric age (e.g., 5 or 25).", "bot");
      return;
    }

    detectedAgeGroup = age < 12 ? "children" : "adults";
    appendMessage(`🧠 Got it! You are looking for medicines for ${detectedAgeGroup}.`, "bot");

    // Filter dataset for symptom + age group
    const matches = dataset.filter(row => {
      const disease = (row.Disease || "").toLowerCase();
      const symptoms = (row.Symptoms || "").toLowerCase();
      const ageGroup = (row.AgeGroup || "").toLowerCase();

      if (currentSymptom === "allergy" && allergyType) {
        return disease.includes(`allergy (${allergyType}`) && ageGroup.includes(detectedAgeGroup);
      }

      return (
        (symptoms.includes(currentSymptom) || disease.includes(currentSymptom)) &&
        ageGroup.includes(detectedAgeGroup)
      );
    });

    if (matches.length > 0) {
      const med = matches[0];
      const medName = med.Medicine || med.medicine;
      const dosage = med.Dosage || med.dosage;
      const precaution = med.Precaution || med.precaution;

      currentMedicine = med;

      appendMessage(`💊 Medicine: ${medName}`, "bot");
      appendMessage(`🕒 Dosage: ${dosage}`, "bot");
      appendMessage(`⚠️ Precaution: ${precaution}`, "bot");
      appendMessage("📦 Enter the quantity you want to order:", "bot");

      waitingForQuantity = true;
      waitingForAge = false;
    } else {
      appendMessage("❌ Sorry, I couldn’t find a medicine for that symptom and age group.", "bot");
      waitingForAge = false;
      currentSymptom = null;
    }
    return;
  }

  // -----------------------
  // 📦 Step 3: Handle Quantity Input
  // -----------------------
  if (waitingForQuantity && currentMedicine) {
    const qty = parseInt(text);
    if (isNaN(qty) || qty <= 0) {
      appendMessage(" Please enter a valid quantity (e.g., 1, 2, 3).", "bot");
      return;
    }

    const medPrice = currentMedicine.Price || currentMedicine.price || 30;
    const medName = currentMedicine.Medicine || currentMedicine.medicine;
    const totalPrice = medPrice * qty;

    // Save pending order
    localStorage.setItem('pendingOrder', JSON.stringify({
      ...currentMedicine,
      Quantity: qty,
      UnitPrice: medPrice,
      TotalPrice: totalPrice,
      AgeGroup: detectedAgeGroup
    }));

    appendMessage(`💊 Medicine: ${medName}`, "bot");
    appendMessage(`🧾 Unit Price: ₹${medPrice}`, "bot");
    appendMessage(`📦 Quantity: ${qty}`, "bot");
    appendMessage(`💰 Total: ₹${totalPrice}`, "bot");
    appendMessage("🧐 Do you want to confirm this order? (yes / no)", "bot");

    waitingForQuantity = false;
    waitingForConfirmation = true;
    return;
  }

  // -----------------------
  // ✅ Step 4: Confirm Order
  // -----------------------
  if (waitingForConfirmation) {
    if (text === "yes" || text === "y") {
      const confirmedOrder = JSON.parse(localStorage.getItem('pendingOrder'));
      localStorage.setItem('orderInfo', JSON.stringify(confirmedOrder));
      appendMessage("✅ Order confirmed successfully!", "bot");
      appendMessage("🛒 Redirecting to your order summary...", "bot");
      waitingForConfirmation = false;
      setTimeout(() => (window.location.href = "order.html"), 1500);
    } else if (text === "no" || text === "n") {
      appendMessage("❌ Order cancelled. You can enter another symptom if you wish.", "bot");
      waitingForConfirmation = false;
    } else {
      appendMessage("⚠️ Please reply with 'yes' or 'no'.", "bot");
    }
    return;
  }

  // -----------------------
  // 🔍 Step 5: Detect Symptom / Disease
  // -----------------------
  appendMessage("🤖 Analyzing your symptoms...", "bot");
  currentSymptom = text;

  setTimeout(() => {
    const input = text.toLowerCase();

    // Smart allergy detection
    if (input.includes("allergy")) {
      appendMessage("💬 What kind of allergy is it — dust, food, or skin?", "bot");
      waitingForAllergyType = true;
      currentSymptom = "allergy";
      return;
    }

    const matches = dataset.filter(row =>
      (row.Symptoms || "").toLowerCase().includes(input) ||
      (row.Disease || "").toLowerCase().includes(input)
    );

    if (matches.length > 0) {
      appendMessage(`🩺 I found possible matches for "${text}".`, "bot");
      appendMessage("👶 Please enter the age (in years) of the person:", "bot");
      waitingForAge = true;
    } else {
      appendMessage("❌ I couldn't find any data for that symptom or disease. Please try another one.", "bot");
      currentSymptom = null;
    }
  }, 1000);
});

// ✅ Logout button
logoutBtn.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = "login.html";
});
