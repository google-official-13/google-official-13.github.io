// script.js – Full version with replies, likes, edit/delete, and 5-minute rule

const form = document.getElementById("feedback-form");
const averageDisplay = document.getElementById("average");
const reviewList = document.getElementById("review-list");
const popup = document.getElementById("popup");
const loader = document.getElementById("loader");
const filterRating = document.getElementById("filterRating");

const db = firebase.database().ref("feedbacks");
const imgbbAPIKey = "3a01fad3d6c23d5bab709c94eae3b9c9";

let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

let currentUser = null;
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    form.name.value = user.displayName || "";
    form.email.value = user.email || "";
    form.name.readOnly = true;
    form.email.readOnly = true;
    form.style.display = "block";
    document.getElementById("user-info").innerText = `Signed in as ${user.displayName}`;
    document.getElementById("user-info").style.display = "block";
    document.getElementById("loginBtn").style.display = "none";
  } else {
    document.getElementById("loginBtn").onclick = () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider).catch(console.error);
    };
  }
});

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
  for (let u in intervals) {
    const v = Math.floor(seconds / intervals[u]);
    if (v >= 1) return `${v} ${u}${v>1?"s":""} ago`;
  }
  return "Just now";
}

function showPopup() {
  popup.classList.add("show");
  setTimeout(()=>popup.classList.remove("show"),3000);
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  const rating = +form.rating.value;
  const file = document.getElementById("imageUpload").files[0];
  loader.style.display = "block";

  const fb = {
    name, email, message, rating,
    imageUrl: null,
    profilePic: currentUser?.photoURL || null,
    date: new Date().toISOString(),
    deviceId,
    userId: currentUser?.uid || null,
    likes: [], replies: {}
  };

  const save = url => {
    fb.imageUrl = url;
    db.push(fb);
    form.reset();
    loader.style.display = "none";
    showPopup();
    setTimeout(loadReviews,500);
  };

  if (file) {
    const fd = new FormData();
    fd.append("image", file);
    fetch(`https://api.imgbb.com/1/upload?key=${imgbbAPIKey}`,{ method:"POST", body:fd })
      .then(r=>r.json())
      .then(d=> d.success ? save(d.data.url) : (loader.style.display="none", alert("Image upload failed.")))
      .catch(_=>{ loader.style.display="none"; alert("Image upload failed."); });
  } else save(null);
});

function enlargeImage(img) {
  const modal = document.getElementById("image-modal"),
        mi = document.getElementById("modal-img");
  mi.src = img.src;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("image-modal").style.display = "none";
}

function toggleLike(id) {
  const ref = db.child(id).child("likes");
  ref.once("value", s => {
    const arr = s.val()||[], key = currentUser?.uid||deviceId, idx=arr.indexOf(key);
    idx>-1 ? arr.splice(idx,1):arr.push(key);
    ref.set(arr).then(loadReviews);
  });
}

function toggleReplyBox(btn) {
  const box = btn.closest(".review-entry").querySelector(".reply-box");
  box.style.display = box.style.display==="block"?"none":"block";
}

function submitReply(id, ta) {
  const txt = ta.value.trim();
  if (!txt) return;
  const rep = {
    message: txt,
    name: currentUser.displayName,
    email: currentUser.email,
    userId: currentUser.uid,
    profilePic: currentUser.photoURL||null,
    date: new Date().toISOString(),
    likes: []
  };
  db.child(id).child("replies").push(rep).then(loadReviews);
}

function editReply(id, rid, old, d) {
  if ((Date.now()-new Date(d))/60000 > 5) return alert("Can only edit within 5 min");
  const nw = prompt("Edit your reply:", old);
  if (nw?.trim()) db.child(id).child("replies").child(rid).update({ message:nw.trim() }).then(loadReviews);
}

function deleteReply(id, rid) {
  db.child(id).child("replies").child(rid).remove().then(loadReviews);
}

function loadReviews() {
  db.once("value", snap => {
    const data = snap.val()||{}, sel=+filterRating.value||0;
    let total=0, cnt=0;
    reviewList.innerHTML="";
    Object.entries(data)
      .sort(([,a],[,b])=>new Date(b.date)-new Date(a.date))
      .forEach(([id, e])=>{
        if(sel && e.rating<sel) return;
        total += e.rating; cnt++;
        const userKey = currentUser?.uid||deviceId,
              liked = e.likes?.includes(userKey),
              likeIcon = liked?"fas":"far",
              likeBtn = `<button class="like-btn" onclick="toggleLike('${id}')">
                           <i class="${likeIcon} fa-heart"></i> ${e.likes?.length||0}
                         </button>`,
              replyBtn = currentUser
                         ? `<button class="reply-btn" onclick="toggleReplyBox(this)">
                              <i class="fas fa-reply"></i> Reply
                            </button>`
                         : "";

        let repliesHTML = "";
        for(const [rid, r] of Object.entries(e.replies||{})) {
          const can = currentUser?.uid===r.userId,
                diff = (Date.now()-new Date(r.date))/60000,
                editBtn = can && diff<5
                        ? `<button class="edit-btn" onclick="editReply('${id}','${rid}','${r.message}','${r.date}')">✏️</button>`
                        : "",
                delBtn = can
                       ? `<button class="delete-btn" onclick="deleteReply('${id}','${rid}')">🗑️</button>`
                       : "";
          repliesHTML += `
            <div class="reply-entry">
              <strong>${r.name}</strong>: ${r.message}
              <span class="review-time">· ${timeAgo(r.date)}</span>
              <div class="reply-actions">${editBtn}${delBtn}</div>
            </div>`;
        }

        const replyBox = currentUser
          ? `<div class="reply-box">
               <textarea placeholder="Write a reply..."></textarea>
               <button onclick="submitReply('${id}', this.previousElementSibling)">Send</button>
             </div>`
          : "";

        const avatar = e.profilePic
                     ? `<img src="${e.profilePic}" class="avatar">`
                     : `<div class="avatar">${e.name[0].toUpperCase()}</div>`;
        const thumb = e.imageUrl
                    ? `<img src="${e.imageUrl}" class="thumbnail" onclick="enlargeImage(this)">`
                    : "";

        const div = document.createElement("div");
        div.className = "review-entry";
        div.innerHTML = `
          <div class="review-header">
            ${avatar}
            <div class="review-user-info">
              <span class="name">${e.name}</span>
              <span class="email">${e.email}</span>
            </div>
          </div>
          <p>${e.message}</p>
          <p>⭐ ${e.rating} <span class="mood-tag">${getMoodTag(e.rating)}</span>
             <span class="review-time">· ${timeAgo(e.date)}</span></p>
          ${thumb}
          <div class="reply-actions">${likeBtn}${replyBtn}</div>
          <div class="reply-section">${repliesHTML}${replyBox}</div>
        `;
        reviewList.appendChild(div);
      });

    averageDisplay.textContent = cnt
      ? `${(total/cnt).toFixed(1)} / 5 (${cnt} reviews)`
      : "N/A";
  });
}

filterRating.addEventListener("change", loadReviews);
loadReviews();
document.getElementById("image-modal").onclick = closeModal;
