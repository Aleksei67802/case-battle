const tg=window.Telegram?.WebApp; tg?.ready(); tg?.expand();

let balance=2500;
let inventory=[];

const items=[
 {name:"Shadow Dagger",rarity:"common",chance:55,icon:"🔪"},
 {name:"Glock Phantom",rarity:"rare",chance:25,icon:"🔫"},
 {name:"AK-47 Neon",rarity:"epic",chance:14,icon:"🔫"},
 {name:"Butterfly Knife",rarity:"epic",chance:5,icon:"🗡️"},
 {name:"Karambit Gold",rarity:"legendary",chance:1,icon:"🔪"}
];

function weightedDrop(){
 let r=Math.random()*100, sum=0;
 for(const item of items){sum+=item.chance;if(r<sum)return item}
 return items[0];
}
function renderPreview(){
 previewGrid.innerHTML=items.map(i=>`<div class="item ${i.rarity}">
 <div class="pic">${i.icon}</div><div class="rarity">${i.rarity.toUpperCase()}</div>
 <h3>${i.name}</h3><p>Шанс ${i.chance}%</p></div>`).join("");
}
function renderInventory(){
 inventoryGrid.innerHTML=inventory.length?inventory.map(i=>`<div class="item ${i.rarity}">
 <div class="pic">${i.icon}</div><div class="rarity">${i.rarity.toUpperCase()}</div><h3>${i.name}</h3>
 </div>`).join(""):`<div style="grid-column:1/-1;text-align:center;color:#666d80;padding:50px 10px">Инвентарь пуст.<br>Открой первый кейс!</div>`;
}
function updateBalance(){document.getElementById("balance").textContent=balance}
function showResult(item){
 resultRarity.textContent=item.rarity.toUpperCase();
 resultRarity.style.color=item.rarity==="legendary"?"#ffbf52":item.rarity==="epic"?"#b36cff":item.rarity==="rare"?"#48a7ff":"#8d96a8";
 resultImage.textContent=item.icon; resultName.textContent=item.name;
 modal.classList.remove("hidden");
}
openBtn.onclick=()=>{
 if(balance<250)return alert("Недостаточно монет");
 balance-=250; updateBalance();
 openBtn.disabled=true; openBtn.textContent="ОТКРЫВАЕМ...";
 setTimeout(()=>{const item=weightedDrop();inventory.push(item);renderInventory();showResult(item);openBtn.disabled=false;openBtn.textContent="ОТКРЫТЬ КЕЙС · 250 💰"},900);
};
closeModal.onclick=()=>modal.classList.add("hidden");

document.querySelectorAll(".nav").forEach(btn=>btn.onclick=()=>{
 document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
 document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
 document.getElementById(btn.dataset.screen).classList.add("active");
});

battleBtn.onclick=()=>{
 if(balance<500)return alert("Недостаточно монет");
 balance-=500;updateBalance();
 const you=weightedDrop(), bot=weightedDrop();
 const power={common:1,rare:2,epic:3,legendary:4};
 const win=power[you.rarity]>=power[bot.rarity];
 if(win){balance+=900;updateBalance();alert(`Ты выиграл!\\n${you.name} против ${bot.name}\\nНаграда: 900 💰`)}
 else alert(`Бот выиграл.\\n${you.name} против ${bot.name}`);
};

renderPreview();renderInventory();updateBalance();