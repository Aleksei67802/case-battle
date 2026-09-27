const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const STORAGE = {
  balance: "casebattle_v3_balance",
  inventory: "casebattle_v3_inventory"
};

const CASES = [
  {
    id: "night",
    name: "NIGHT OPS",
    tag: "STARTER",
    price: 250,
    art: "🗡️",
    glow: "#635bff",
    desc: "Тёмный кейс с быстрыми дропами.",
    items: [
      ["Shadow Dagger","common",80,"🗡️"],
      ["USP Carbon","common",220,"🔫"],
      ["Glock Phantom","rare",420,"🔫"],
      ["AK Neon","epic",850,"🔫"],
      ["Butterfly Night","legendary",1900,"🦋"]
    ]
  },
  {
    id: "neon",
    name: "NEON RUSH",
    tag: "HOT",
    price: 500,
    art: "🔫",
    glow: "#00d4ff",
    desc: "Яркие предметы и сильные эпики.",
    items: [
      ["P250 Pulse","common",350,"🔫"],
      ["MP7 Vector","common",500,"🔫"],
      ["M4A1 Neon","rare",850,"🔫"],
      ["Karambit Blue","epic",1700,"🔪"],
      ["Butterfly Cyber","legendary",4200,"🦋"]
    ]
  },
  {
    id: "gold",
    name: "GOLD VAULT",
    tag: "PREMIUM",
    price: 1000,
    art: "👑",
    glow: "#ffc44d",
    desc: "Дорогой кейс с золотыми предметами.",
    items: [
      ["Five-SeveN Gold","common",700,"🔫"],
      ["AK Golden Line","rare",1200,"🔫"],
      ["M4 Gold Dust","rare",1600,"🔫"],
      ["Desert Eagle Gold","epic",2800,"🔫"],
      ["Karambit Gold","legendary",6500,"🔪"]
    ]
  },
  {
    id: "dragon",
    name: "DRAGON",
    tag: "ULTRA",
    price: 2500,
    art: "🐉",
    glow: "#ff4f8b",
    desc: "Редкие дропы для охотников за легендарками.",
    items: [
      ["Tec-9 Flame","common",1800,"🔫"],
      ["AWP Dragon","rare",3200,"🎯"],
      ["AK Inferno","epic",5200,"🔫"],
      ["Talon Crimson","epic",7200,"🔪"],
      ["Dragon Karambit","legendary",15000,"🐉"]
    ]
  }
];

const WEIGHTS = { common: 58, rare: 25, epic: 14, legendary: 3 };

let balance = Number(localStorage.getItem(STORAGE.balance) ?? 5000);
let inventory = JSON.parse(localStorage.getItem(STORAGE.inventory) ?? "[]");
let selectedCase = null;
let pendingItem = null;
let openingTimer = null;
let currentFilter = "all";

const $ = (id) => document.getElementById(id);
const balanceEl = $("balance");
const caseGrid = $("caseGrid");
const inventoryGrid = $("inventoryGrid");
const inventoryCount = $("inventoryCount");
const openModal = $("openModal");
const resultModal = $("resultModal");
const rouletteTrack = $("rouletteTrack");
const rouletteStatus = $("rouletteStatus");
const skipBtn = $("skipBtn");

function save() {
  localStorage.setItem(STORAGE.balance, String(balance));
  localStorage.setItem(STORAGE.inventory, JSON.stringify(inventory));
}

function money(n) {
  return Math.round(n).toLocaleString("ru-RU");
}

function updateBalance() {
  balanceEl.textContent = money(balance);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 1800);
}

function itemObject(data) {
  return { name: data[0], rarity: data[1], value: data[2], icon: data[3], id: Date.now() + Math.random() };
}

function weightedDrop(items) {
  const pool = [];
  items.forEach(item => {
    const w = WEIGHTS[item[1]] ?? 1;
    for (let i = 0; i < w; i++) pool.push(item);
  });
  return itemObject(pool[Math.floor(Math.random() * pool.length)]);
}

function renderCases() {
  caseGrid.innerHTML = CASES.map(c => `
    <article class="case-card" style="--case-glow:${c.glow}" data-case="${c.id}">
      <div class="case-top">
        <span class="case-tag">${c.tag}</span>
        <span class="case-price"><i>◆</i> ${money(c.price)}</span>
      </div>
      <div class="case-art">${c.art}</div>
      <div class="case-name">${c.name}</div>
      <div class="case-desc">${c.desc}</div>
      <button class="case-btn" data-open="${c.id}">ОТКРЫТЬ КЕЙС</button>
    </article>
  `).join("");

  document.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => startOpening(btn.dataset.open));
  });
}

function renderInventory() {
  const filtered = currentFilter === "all"
    ? inventory
    : inventory.filter(x => x.rarity === currentFilter);

  inventoryCount.textContent = inventory.length;

  if (!filtered.length) {
    inventoryGrid.innerHTML = `<div class="empty">Пока пусто.<br>Открой кейс и добавь первый предмет в коллекцию.</div>`;
    return;
  }

  inventoryGrid.innerHTML = filtered.slice().reverse().map(item => `
    <article class="item-card" style="--rarity-glow:${rarityGlow(item.rarity)}">
      <div class="item-art">${item.icon}</div>
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="item-meta">
        <span class="rarity-dot ${item.rarity}">${rarityName(item.rarity)}</span>
        <span class="item-value">◆ ${money(item.value)}</span>
      </div>
      <button class="sell-btn" data-sell="${item.id}">ПРОДАТЬ · ${money(item.value)} ◆</button>
    </article>
  `).join("");

  document.querySelectorAll("[data-sell]").forEach(btn => {
    btn.addEventListener("click", () => sellItem(btn.dataset.sell));
  });
}

function rarityName(r) {
  return ({common:"ОБЫЧНЫЙ",rare:"РЕДКИЙ",epic:"ЭПИЧЕСКИЙ",legendary:"ЛЕГЕНДАРНЫЙ"})[r] || r;
}

function rarityGlow(r) {
  return ({common:"rgba(155,165,181,.2)",rare:"rgba(77,163,255,.22)",epic:"rgba(180,108,255,.25)",legendary:"rgba(255,196,77,.3)"})[r];
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function navTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === pageId));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === pageId));
  window.scrollTo({top:0, behavior:"smooth"});
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => navTo(btn.dataset.page));
});

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    renderInventory();
  });
});

function startOpening(caseId) {
  if (openingTimer) return;

  selectedCase = CASES.find(c => c.id === caseId);
  if (!selectedCase) return;

  if (balance < selectedCase.price) {
    toast("Недостаточно монет");
    return;
  }

  balance -= selectedCase.price;
  save();
  updateBalance();

  pendingItem = weightedDrop(selectedCase.items);

  $("modalCaseName").textContent = selectedCase.name;
  $("rouletteStatus").textContent = "Рулетка запускается...";
  skipBtn.classList.add("hidden");
  openModal.classList.remove("hidden");

  buildRoulette();
  requestAnimationFrame(() => requestAnimationFrame(runRoulette));
}

function buildRoulette() {
  rouletteTrack.innerHTML = "";
  const total = 38;
  const winnerIndex = 31;

  for (let i = 0; i < total; i++) {
    const data = i === winnerIndex
      ? [pendingItem.name, pendingItem.rarity, pendingItem.value, pendingItem.icon]
      : selectedCase.items[Math.floor(Math.random() * selectedCase.items.length)];

    const el = document.createElement("div");
    el.className = "roulette-item";
    el.innerHTML = `
      <div class="ri-icon">${data[3]}</div>
      <div class="ri-name">${escapeHtml(data[0])}</div>
    `;
    rouletteTrack.appendChild(el);
  }

  rouletteTrack.style.transition = "none";
  rouletteTrack.style.transform = "translateX(0)";
}

function runRoulette() {
  const itemWidth = 118;
  const gap = 10;
  const winnerIndex = 31;
  const viewport = document.querySelector(".roulette-window").clientWidth;
  const centerOffset = viewport / 2 - itemWidth / 2;
  const target = winnerIndex * (itemWidth + gap) - centerOffset;

  rouletteStatus.textContent = "Идёт открытие...";
  skipBtn.classList.remove("hidden");

  requestAnimationFrame(() => {
    rouletteTrack.style.transition = "transform 4.7s cubic-bezier(.08,.78,.1,1)";
    rouletteTrack.style.transform = `translateX(-${target}px)`;
  });

  openingTimer = setTimeout(finishOpening, 4850);
}

function finishOpening() {
  if (!pendingItem) return;
  clearTimeout(openingTimer);
  openingTimer = null;
  skipBtn.classList.add("hidden");
  rouletteStatus.textContent = "Готово!";
  inventory.push(pendingItem);
  save();
  renderInventory();
  updateBalance();
  setTimeout(() => {
    openModal.classList.add("hidden");
    showResult(pendingItem);
  }, 350);
}

skipBtn.addEventListener("click", finishOpening);

function showResult(item) {
  $("resultIcon").textContent = item.icon;
  $("resultRarity").textContent = rarityName(item.rarity);
  $("resultRarity").className = `rarity-label ${item.rarity}`;
  $("resultName").textContent = item.name;
  $("resultPrice").textContent = money(item.value);
  $("sellResultPrice").textContent = money(item.value);
  resultModal.classList.remove("hidden");

  $("sellResultBtn").onclick = () => {
    const idx = inventory.findIndex(x => x.id === item.id);
    if (idx >= 0) inventory.splice(idx, 1);
    balance += item.value;
    save();
    updateBalance();
    renderInventory();
    resultModal.classList.add("hidden");
    toast(`Продано за ${money(item.value)} ◆`);
  };

  $("keepResultBtn").onclick = () => {
    resultModal.classList.add("hidden");
    toast("Предмет добавлен в инвентарь");
  };
}

$("closeOpenModal").addEventListener("click", () => {
  if (!openingTimer) openModal.classList.add("hidden");
});

document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", () => {
    if (!openingTimer) {
      openModal.classList.add("hidden");
      resultModal.classList.add("hidden");
    }
  });
});

$("battleBtn").addEventListener("click", () => {
  const cost = 500;
  if (balance < cost) {
    toast("Недостаточно монет для Battle");
    return;
  }

  balance -= cost;
  const player = Math.floor(Math.random() * 100) + 1;
  const bot = Math.floor(Math.random() * 100) + 1;
  $("playerPower").textContent = player;
  $("botPower").textContent = bot;

  const msg = $("battleMessage");
  if (player >= bot) {
    balance += 900;
    msg.textContent = `Победа! +900 ◆ · итоговый баланс ${money(balance)} ◆`;
    msg.style.color = "#5ff0b0";
  } else {
    msg.textContent = `Победил BOT. -500 ◆ · попробуй ещё раз`;
    msg.style.color = "#ff8ca0";
  }

  save();
  updateBalance();
});

function resetDemo() {
  balance = 5000;
  inventory = [];
  save();
  updateBalance();
  renderInventory();
  toast("Прогресс сброшен");
}

window.caseBattleReset = resetDemo;

renderCases();
renderInventory();
updateBalance();
