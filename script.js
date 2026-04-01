function openSpin() {
  const modal = document.getElementById("spinModal");
  if (modal) modal.style.display = "flex";
}

function closeSpin() {
  const modal = document.getElementById("spinModal");
  if (modal) modal.style.display = "none";
}

function spinWheel() {
  const wheel = document.getElementById("wheel");
  const result = document.getElementById("spin-result");
  const rewards = ["10% OFF", "20% OFF", "Free Shipping", "₹500 OFF"];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  const rotation = 1440 + Math.floor(Math.random() * 360);

  wheel.style.transform = `rotate(${rotation}deg)`;

  setTimeout(() => {
    result.textContent = `Congratulations! You won ${reward}`;
    localStorage.setItem("discountCoupon", reward);
  }, 3000);
}