//──────────────────────────────────────────────────────────────────────────────
// index.js (화상회의 제거 + 화면 공유만)
//──────────────────────────────────────────────────────────────────────────────
// ── 화면 공유 관련 버튼 가져오기 ──
const startScreenShareBtn = document.getElementById("startScreenShareBtn");
const endScreenShareBtn = document.getElementById("endScreenShareBtn");
// ── 화상 공유 관련 버튼 가져오기 ──
const startVideoChatBtn = document.getElementById("startVideoChatBtn");
const endVideoChatBtn = document.getElementById("endVideoChatBtn");
const videoChatStatus = document.getElementById("video-chat-status");
// 뷰어 “보기 중지” 버튼으로도 재활용
const stopViewBtn = endScreenShareBtn;
import { auth, db, app, storage, firestore, database } from './firebase-config.js';
import { sendFriendRequest, getFriends } from './friend.js';
import {
  setDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  onChildChanged,
  set,
  remove,
  get,
  off,
  update,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
// ---------------------- 프로필 UID 기반 색상 설정 함수 ----------------------
function getColorFromUID(uid) {
  const bgColors = ["#ff8a80", "#82b1ff", "#b9f6ca", "#f48fb1", "#ce93d8", "#80deea", "#a5d6a7", "#e6ee9c"];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % bgColors.length;
  return bgColors[index];
}

// ✅ 슬라이드 토글 함수
function slideToggle(element, duration = 300) { // 속도 조정
  if (window.getComputedStyle(element).display === 'none') {
    element.style.display = 'block';
    const height = element.scrollHeight; // offsetHeight 대신 scrollHeight 사용
    element.style.height = '0px';
    setTimeout(() => {
      element.style.transition = `height ${duration}ms ease-in-out`; // 애니메이션 방식 조정
      element.style.height = `${height}px`;
    }, 10);
    setTimeout(() => {
      element.style.height = '';
      element.style.transition = '';
    }, duration);
  } else {
    element.style.transition = `height ${duration}ms ease-in-out`; // 애니메이션 방식 조정
    element.style.height = `${element.scrollHeight}px`; // offsetHeight 대신 scrollHeight 사용
    setTimeout(() => {
      element.style.height = '0px';
    }, 10);
    setTimeout(() => {
      element.style.display = 'none';
      element.style.transition = '';
      element.style.height = '';
    }, duration);
  }
}

onAuthStateChanged(auth, async (user) => {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const welcomeText = document.getElementById('welcomeText');
  const nicknameDisplay = document.getElementById('nicknameDisplay');
  const profileDisplay = document.getElementById('profileDisplay');
  const profileNickname = document.getElementById('profileNickname');
  const profileWrapper = document.getElementById('profileWrapper');
  const profileMenu = document.getElementById('profileMenu');
  const mainContent = document.getElementById('mainContent');
  const guestInfo = document.getElementById('guest-info');
  const chatSection = document.getElementById("chat-section");

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }

  if (user) {
    // 로그인 상태
    if (mainContent) mainContent.style.display = "flex";
    if (guestInfo) guestInfo.style.display = "none";
    if (chatSection) chatSection.style.display = "flex";

    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    profileWrapper.style.display = 'flex';

    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      const nickname = snap.exists() ? snap.data().nickname || user.email : user.email;
      const photoURL = snap.exists() ? snap.data().photoURL : null;

      const displayName = nickname || user.email || "사용자";
      window.nickname = displayName;
      sessionStorage.setItem('nickname', displayName);

      if (welcomeText) welcomeText.textContent = `${displayName}님 환영합니다!`;
      if (nicknameDisplay) nicknameDisplay.textContent = `${displayName} 님`;

      if (profileDisplay && profileNickname) {
        const bgColor = photoURL ? 'transparent' : getColorFromUID(user.uid);
        profileDisplay.innerHTML = photoURL ?
          `<img src="${photoURL}" style="width:100%; height:100%; object-fit:cover;" alt="프로필">` : '';
        profileDisplay.style.backgroundColor = bgColor;
        profileNickname.textContent = displayName;
      }

      // 프로필 메뉴 토글
      if (profileWrapper && profileMenu) {
        profileWrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          slideToggle(profileMenu);
        });

        document.addEventListener('click', (e) => {
          if (!profileWrapper.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.style.display = 'none';
          }
        });
      }

      loadAllNicknames();
      loadMyRoomsWithMemberClick();
    } catch (error) {
      console.error("Firestore에서 닉네임 불러오기 실패:", error);
      if (welcomeText) welcomeText.textContent = `${user.email}님 환영합니다!`;
    }

    loadEvents(user.uid);
  } else {
    // 로그아웃 상태
    if (mainContent) mainContent.style.display = "none";
    if (guestInfo) guestInfo.style.display = "block";
    if (chatSection) chatSection.style.display = "none";

    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    profileWrapper.style.display = 'none';

    if (welcomeText) welcomeText.textContent = '';
    if (nicknameDisplay) nicknameDisplay.textContent = '';
  }
});

// 로그아웃
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      alert('로그아웃 성공!');
      window.location.href = 'index.html';
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert(`로그아웃 실패: ${error.message}`);
    }
  });
};

// ---------------------- 캘린더 렌더링 ----------------------
let allEvents = [];
let currentDate = new Date();
let selectedDate = null;

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const currentMonthEl = document.getElementById('currentMonth');
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  currentMonthEl.textContent = `${year}년 ${monthNames[month]}`;

  const calendarDatesEl = document.getElementById('calendarDates');
  calendarDatesEl.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventDatesSet = new Set(allEvents.map(ev => ev.date));

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('calendar-cell');
    calendarDatesEl.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('calendar-cell');
    dayCell.textContent = day;

    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    dayCell.dataset.date = dateStr;

    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) {
      dayCell.classList.add('today');
    }

    if (dateStr === selectedDate) {
      dayCell.classList.add('selected');
    }

    if (eventDatesSet.has(dateStr)) {
      dayCell.classList.add('has-event');
    }

    const isShared = allEvents.some(ev =>
      ev.date === dateStr &&
      ev.sharedWith?.includes(sessionStorage.getItem("nickname"))
    );
    if (isShared) {
      dayCell.classList.add("shared-event");
    }

    dayCell.addEventListener('click', () => {
      selectDateCell(dayCell);
    });

    calendarDatesEl.appendChild(dayCell);
  }
}

function selectDateCell(cell) {
  document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
  cell.classList.add('selected');
  selectedDate = cell.dataset.date;
  document.getElementById('inputArea').style.display = 'flex';
  filterEventsBySelectedDate();
}

document.getElementById('prevMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

renderCalendar();

const friendBtn = document.getElementById('friendBtn');
const friendModal = document.getElementById('friendModal');
const closeFriendModal = document.querySelector('.closeFriendModal');

friendBtn.addEventListener('click', () => {
  friendModal.style.display = 'block';
});

closeFriendModal.addEventListener('click', () => {
  friendModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === friendModal) {
    friendModal.style.display = 'none';
  }
});

// ---------------------- Firestore 연동 ----------------------
let unsubscribe = null;

async function loadEvents(userId) {
  if (unsubscribe) unsubscribe();

  const currentNickname = sessionStorage.getItem("nickname");
  const allTempEvents = [];

  const myEventsRef = collection(db, 'users', userId, 'userEvents');
  const myQuery = query(myEventsRef, orderBy('createdAt', 'asc'));

  unsubscribe = onSnapshot(myQuery, async (snapshot) => {
    allTempEvents.length = 0;

    snapshot.forEach((docSnap) => {
      allTempEvents.push({ id: docSnap.id, ...docSnap.data() });
    });

    const usersSnapshot = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnapshot.docs) {
      if (userDoc.id === userId) continue;

      const otherEventsRef = collection(db, 'users', userDoc.id, 'userEvents');
      const otherSnapshot = await getDocs(otherEventsRef);

      otherSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.sharedWith?.includes(currentNickname)) {
          allTempEvents.push({ id: docSnap.id, ...data });
        }
      });
    }

    allEvents = allTempEvents;
    renderCalendar();
    filterEventsBySelectedDate();
  });
}

function filterEventsBySelectedDate() {
  const currentNickname = sessionStorage.getItem("nickname");
  const user = auth.currentUser;
  const eventListEl = document.getElementById('eventList');
  eventListEl.innerHTML = '';

  if (!selectedDate) return;

  const filtered = allEvents.filter(ev => ev.date === selectedDate);

  filtered.forEach(ev => {
    const li = document.createElement('li');
    li.classList.add('event-item');
    li.textContent = ev.text;

    const delBtn = document.createElement('button');
    delBtn.textContent = '삭제';
    delBtn.classList.add('delete-btn');

    const isShared = ev.sharedWith?.includes(currentNickname);

    if (!isShared) {
      delBtn.addEventListener('click', async () => {
        if (user) {
          await deleteDoc(doc(db, 'users', user.uid, 'userEvents', ev.id));
          loadEvents(user.uid);
        }
      });
    } else {
      delBtn.style.display = 'none';
    }

    li.appendChild(delBtn);
    eventListEl.appendChild(li);
  });
}

const addEventBtn = document.getElementById('addEventBtn');
addEventBtn.addEventListener('click', async () => {
  const shareInput = document.getElementById('shareNickname');
  const sharedNickname = shareInput?.value.trim();
  const user = auth.currentUser;
  if (!user) return alert("로그인이 필요합니다.");
  if (!selectedDate) return alert("날짜를 먼저 선택하세요.");

  const eventInput = document.getElementById('eventInput');
  const eventText = eventInput.value.trim();
  if (!eventText) return alert("일정 내용을 입력하세요.");

  await addDoc(collection(db, 'users', user.uid, 'userEvents'), {
    text: eventText,
    date: selectedDate,
    createdAt: serverTimestamp(),
    sharedWith: sharedNickname ? [sharedNickname] : []
  });

  eventInput.value = '';
});

const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeBtn = document.querySelector('.closeBtn');
const guestInfo = document.getElementById('guest-info');

const closeAboutModalBtn = document.getElementById('closeAboutModal');
if (closeAboutModalBtn) {
  closeAboutModalBtn.addEventListener('click', () => {
    aboutModal.style.display = 'none';
    if (!auth.currentUser && guestInfo) {
      guestInfo.style.display = 'block';
    }
  });
}


aboutBtn.addEventListener('click', () => {
  aboutModal.style.display = 'block';

  if (!auth.currentUser && guestInfo) {
    guestInfo.style.display = 'none';
  }
});

closeBtn.addEventListener('click', () => {
  aboutModal.style.display = 'none';

  if (!auth.currentUser && guestInfo) {
    guestInfo.style.display = 'block';
  }
});

window.addEventListener('click', (e) => {
  if (e.target === aboutModal) {
    aboutModal.style.display = 'none';

    if (!auth.currentUser && guestInfo) {
      guestInfo.style.display = 'block';
    }
  }
});

const sendRequestBtn = document.getElementById('sendRequestBtn');
if (sendRequestBtn) {
  sendRequestBtn.addEventListener('click', async () => {
    const friendNickname = document.getElementById('friendNickname').value.trim();
    if (!friendNickname) {
      alert("닉네임을 입력하세요.");
      return;
    }
    await sendFriendRequest(friendNickname);
  });
}

async function loadAllNicknames() {
  const nicknameListEl = document.getElementById('nicknameList');
  if (!nicknameListEl) return;

  const myNickname = sessionStorage.getItem("nickname");
  const friends = await getFriends();
  nicknameListEl.innerHTML = '';

  for (const uid of friends) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const nickname = userDoc.data().nickname;
      const li = document.createElement('li');
      li.textContent = nickname;
      nicknameListEl.appendChild(li);
    }
  }
}

// 로드 시 친구 목록 불러오기
document.addEventListener('DOMContentLoaded', loadAllNicknames);

// 친구 탭 전환
const friendTabBtns = document.querySelectorAll('.friendTabBtn');
const friendTabPages = document.querySelectorAll('.friendTabPage');

friendTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.dataset.tab;

    friendTabPages.forEach(page => {
      page.style.display = page.id === `tab-${targetTab}` ? 'block' : 'none';
    });
  });
});

const myRoomsList = document.getElementById('myRoomsList');
const currentRoomNameEl = document.getElementById('currentRoomName');
const chatMessages = document.getElementById('chatMessages');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatInput = document.getElementById('chatInput');

let currentRoomId = null;

async function loadMyRoomsWithMemberClick() {
  const userNickname = sessionStorage.getItem("nickname");
  const q = query(collection(db, "chatRooms"), where("members", "array-contains", userNickname));
  const snapshot = await getDocs(q);

  myRoomsList.innerHTML = '';

  const currentRoomNameEl = document.getElementById("currentRoomName");
  const chatBox = document.getElementById("chatBox");
  const memberList = document.getElementById("memberList");

  // 채팅방이 없을 때
  if (snapshot.empty) {
    const emptyMsg = document.createElement('li');
    emptyMsg.textContent = "채팅방이 없습니다";
    emptyMsg.style.color = "#777";
    myRoomsList.appendChild(emptyMsg);
    if (currentRoomNameEl) currentRoomNameEl.textContent = "채팅방을 만들어보세요!";
    if (chatBox) chatBox.innerHTML = '<p style="color:#888;">메시지를 주고받으려면 먼저 채팅방을 만들어야 합니다.</p>';
    if (memberList) memberList.innerHTML = '';
    return;
  }

  // 채팅방 선택하기 전 기본 화면
  if (currentRoomNameEl) currentRoomNameEl.textContent = "채팅방을 선택해 주세요";
  if (chatBox) chatBox.innerHTML = '<p style="color:#888;">채팅방을 선택해 주세요</p>';
  if (memberList) memberList.innerHTML = '';

  snapshot.forEach(docSnap => {
    const room = docSnap.data();
    const roomId = docSnap.id;

    const li = document.createElement('li');

    const titleSpan = document.createElement('span');
    titleSpan.textContent = room.title;
    titleSpan.style.flex = "1";
    li.appendChild(titleSpan);

    const myNickname = sessionStorage.getItem("nickname");

    if (room.createdBy === myNickname) {
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '삭제';
      deleteBtn.style.marginLeft = '10px';
      deleteBtn.classList.add('delete-btn');

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmDelete = confirm(`"${room.title}"정말 채팅방을 삭제하시겠습니까?`);
        if (!confirmDelete) return;
        await deleteDoc(doc(db, "chatRooms", roomId));
        loadMyRoomsWithMemberClick();
      });

      li.appendChild(deleteBtn);
    }

    myRoomsList.appendChild(li);

    // 채팅방 클릭 시 이벤트 리스너
    li.addEventListener("click", async () => {
      currentRoomId = roomId;
      cleanupVoiceChatData();
      currentRoomNameEl.textContent = `채팅방: ${room.title}`;
      loadChatMessages(currentRoomId);
      memberList.innerHTML = '';

      const roomDocSnap = await getDoc(doc(db, "chatRooms", currentRoomId));
      if (!roomDocSnap.exists()) {
          memberList.innerHTML = "<li>채팅방 정보를 찾을 수 없습니다.</li>";
          return;
      }

      const roomData = roomDocSnap.data();
      const members = roomData.members || [];
      const createdBy = roomData.createdBy;
      const myNickname = sessionStorage.getItem("nickname");

      if (members.length === 0) {
          memberList.innerHTML = "<li>채팅방에 멤버가 없습니다.</li>";
          return;
      }

      // ✅ 멤버를 표시하고 추방 버튼을 추가하는 단일 for 루프
      for (const member of members) {
          const li = document.createElement("li");
          if (member === createdBy) {
              li.innerHTML = `👑 <strong>${member}</strong> (관리자)`;
          } else {
              li.textContent = member;
          }

          if (myNickname === createdBy && member !== myNickname) {
              const kickBtn = document.createElement('button');
              kickBtn.textContent = '추방';
              kickBtn.classList.add('delete-btn');
              kickBtn.style.marginLeft = '8px';

              kickBtn.addEventListener('click', async (e) => {
                  e.stopPropagation();
                  const confirmKick = confirm(`${member}님을 채팅방에서 추방하시겠습니까?`);
                  if (confirmKick) {
                      const roomRef = doc(db, "chatRooms", currentRoomId);
                      await updateDoc(roomRef, {
                          members: arrayRemove(member)
                      });
                      alert(`${member}님이 추방되었습니다.`);
                  }
              });
              li.appendChild(kickBtn);
          }

          memberList.appendChild(li);
      }
    });
  });
}

loadMyRoomsWithMemberClick();
let currentScreenHostUid = null; // 🔵 전역에 추가
// 채팅방 메시지 불러오기
function loadChatMessages(roomId) {
  const messagesRef = collection(db, "chatRooms", roomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  const chatMessages = document.getElementById("chatMessages");
  const myNickname = sessionStorage.getItem("nickname");

  onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = '';

    snapshot.forEach((doc) => {
      const data = doc.data();

      const messageWrapper = document.createElement("div");
      messageWrapper.classList.add("chat-message");

      // ✅ [1] 화면 공유 알림 메시지
      if (data.type === "screen-share") {
        const wrapper = document.createElement("div");
        wrapper.classList.add("chat-message", "system-message");

        const bubble = document.createElement("div");
        bubble.classList.add("bubble");
        bubble.innerHTML = `<strong>[알림]</strong> ${data.message}`;

        // ✅ 보기 버튼 추가 (시작 알림일 경우만)
        if (data.isStreamAlert && data.streamType === "screen" && data.senderUid) {
          const btn = document.createElement("button");
          btn.textContent = "보기";
          btn.classList.add("btn", "btn-sm");
          btn.style.marginLeft = "8px";

          btn.addEventListener("click", async () => {
            const roomId = currentRoomId;
            const myUid = auth.currentUser?.uid;
            if (!myUid || !roomId) return;

            // 🔁 기존 연결 및 리스너 정리
            if (viewerOfferListener) viewerOfferListener();
            if (viewerCandidateListener) viewerCandidateListener();
            viewerOfferListener = null;
            viewerCandidateListener = null;

            if (peerConnectionsByRoom[roomId]?.[data.senderUid]) {
              peerConnectionsByRoom[roomId][data.senderUid].close();
              delete peerConnectionsByRoom[roomId][data.senderUid];
            }

            // 🔁 screenShareUsers 재등록
            await remove(ref(database, `screenShareUsers/${roomId}/${myUid}`));
            await set(ref(database, `screenShareUsers/${roomId}/${myUid}`), true);

            const pc = createOrReuseConnection(data.senderUid, roomId, "screen");
            currentScreenHostUid = data.senderUid;
            startScreenViewerListeners();

            // 🔁 리스너 등록
            const offersRef = ref(database, `screenShareOffers/${roomId}`);
            viewerOfferListener = onChildAdded(offersRef, async snapOffer => {
              const offer = snapOffer.val();
              if (
                offer.type === "offer" &&
                offer.sender === data.senderUid &&
                offer.receiver === myUid
              ) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(offer));

                  for (const queued of pc._queuedCandidates) {
                    await pc.addIceCandidate(new RTCIceCandidate(queued)).catch(() => { });
                  }
                  pc._queuedCandidates = [];

                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  await push(ref(database, `screenShareOffers/${roomId}`), {
                    type: "answer",
                    sdp: answer.sdp,
                    sender: myUid,
                    receiver: data.senderUid,
                    streamType: "screen"
                  });
                } catch (e) {
                  console.warn("❌ offer/answer 처리 오류:", e);
                }
              }
            });

            const candsRef = ref(database, `screenShareCandidates/${roomId}`);
            viewerCandidateListener = onChildAdded(candsRef, snap => {
              const c = snap.val();
              if (c.sender === data.senderUid && c.receiver === myUid) {
                pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
              }
            });

            // ✅ UI 표시
            const remoteVideo = document.getElementById("remoteVideo");
            remoteVideo.srcObject = null;
            remoteVideo.style.display = "block";
            document.getElementById("screenVideo").style.display = "none";
            document.getElementById("localVideo").style.display = "none";
            document.getElementById("videoContainer").style.display = "flex";

            // ✅ 종료 버튼 리셋 및 재등록
            const oldBtn = document.getElementById("endScreenShareBtn");
            const newBtn = oldBtn.cloneNode(true);
            oldBtn.parentNode.replaceChild(newBtn, oldBtn);

            newBtn.disabled = false;
            newBtn.style.display = "inline-block";

            newBtn.addEventListener("click", async () => {
              console.log("🛑 뷰어 종료 버튼 클릭됨");
              remoteVideo.pause();
              remoteVideo.srcObject?.getTracks().forEach(track => track.stop());
              remoteVideo.srcObject = null;
              remoteVideo.load();
              remoteVideo.style.display = "none";
              document.getElementById("videoContainer").style.display = "none";
              screenShareStatus.textContent = "화면 공유: 종료됨";

              await remove(ref(database, `screenShareUsers/${roomId}/${myUid}`));

              if (peerConnectionsByRoom[roomId]) {
                Object.values(peerConnectionsByRoom[roomId]).forEach(pc => pc.close());
                delete peerConnectionsByRoom[roomId];
              }

              newBtn.style.display = "none";
              startScreenShareBtn.disabled = false;
              endScreenShareBtn.disabled = true;
              currentScreenHostUid = null;
            });

            // ✅ 재생 시도
            setTimeout(() => {
              remoteVideo.play().catch((e) => {
                console.warn("⚠️ remoteVideo 재생 실패:", e);
              });
            }, 300);
          });

          bubble.appendChild(btn);
        }

        wrapper.appendChild(bubble);
        chatMessages.appendChild(wrapper);
        return;
      }

      // ✅ [1.5] 영상/화면 공유 알림 메시지는 일반 채팅으로 출력하지 않음
      if (data.type === "video-share" || data.type === "screen-share") {
        return;  // 이미 별도 로직에서 처리됨
      }

      // ✅ [2] 일반 채팅 메시지
      if (data.sender === myNickname) {
        messageWrapper.classList.add("me");
      } else {
        messageWrapper.classList.add("you");
      }

      const bubble = document.createElement("div");
      bubble.classList.add("bubble");
      bubble.textContent = `${data.sender}: ${data.text}`;

      messageWrapper.appendChild(bubble);
      chatMessages.appendChild(messageWrapper);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// 채팅 전송
sendChatBtn.addEventListener('click', async () => {
  if (!currentRoomId) return alert("채팅방을 선택하세요.");
  const text = chatInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "chatRooms", currentRoomId, "messages"), {
    sender: sessionStorage.getItem("nickname"),
    text,
    createdAt: serverTimestamp()
  });

  chatInput.value = '';
});

document.getElementById("chatInput").addEventListener("keypress", async (e) => {
  if (e.key === "Enter") {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text || !currentRoomId) return;

    await addDoc(collection(db, "chatRooms", currentRoomId, "messages"), {
      sender: sessionStorage.getItem("nickname"),
      text,
      createdAt: serverTimestamp()
    });

    input.value = '';
  }
});


async function loadFriendsForRoom() {
  const friends = await getFriends();  // friend.js 함수
  friendListForRoom.innerHTML = '';

  for (const uid of friends) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const nickname = userDoc.exists() ? userDoc.data().nickname : "알 수 없음";

    const li = document.createElement('li');
    const cb = document.createElement('input');
    cb.type = "checkbox";
    cb.value = nickname;

    li.appendChild(cb);
    li.append(" " + nickname);
    friendListForRoom.appendChild(li);
  }
}

document.getElementById('friendBtn').addEventListener('click', () => {
  document.getElementById('friendModal').style.display = 'block';
  loadFriendsForRoom();
});

loadAllNicknames();

//채팅방 생성

// 모달 요소들
const createRoomModal = document.getElementById('createRoomModal');
const openCreateRoomModalBtn = document.getElementById('openCreateRoomModalBtn');
const closeCreateRoomModal = document.getElementById('closeCreateRoomModal');
const confirmCreateRoomBtn = document.getElementById('confirmCreateRoomBtn');

// 모달 열기
if (openCreateRoomModalBtn) {
  openCreateRoomModalBtn.addEventListener('click', () => {
    createRoomModal.style.display = 'block';
    loadFriendListForModal(); // 친구목록 불러오기 함수 (별도 정의 필요)
  });
}

// 모달 닫기
if (closeCreateRoomModal) {
  closeCreateRoomModal.addEventListener('click', () => {
    createRoomModal.style.display = 'none';
  });
}

// 모달 밖 클릭시 닫기
window.addEventListener('click', (e) => {
  if (e.target === createRoomModal) {
    createRoomModal.style.display = 'none';
  }
});

// 채팅방 생성
if (confirmCreateRoomBtn) {
  confirmCreateRoomBtn.addEventListener('click', async () => {
    const roomName = document.getElementById('modalRoomName').value.trim();
    const selectedFriends = [...document.querySelectorAll('#modalFriendList input[type="checkbox"]:checked')]
      .map(input => input.value); // 이미 이 값은 닉네임이여야 함

    if (!roomName) return alert("채팅방 이름을 입력해주세요.");

    try {
      const user = auth.currentUser;
      if (!user) return alert("로그인이 필요합니다.");

      const myNickname = sessionStorage.getItem("nickname"); // ✅ 내 닉네임
      const members = [myNickname, ...selectedFriends];      // ✅ 닉네임 배열로 설정

      await addDoc(collection(db, "chatRooms"), {
        title: roomName,               // ✅ name 대신 title로 저장 (조회에서도 일치해야 함)
        createdBy: myNickname,
        members,
        createdAt: serverTimestamp()
      });

      alert("채팅방이 생성되었습니다.");
      createRoomModal.style.display = 'none';
      loadMyRoomsWithMemberClick();
    } catch (error) {
      console.error("채팅방 생성 실패:", error);
      alert("채팅방 생성 중 오류 발생");
    }
  });
}


loadMyRoomsWithMemberClick();

//친구 리스트 로딩

async function loadFriendListForModal() {
  const modalFriendList = document.getElementById('modalFriendList');
  modalFriendList.innerHTML = '';
  const friendUIDs = await getFriends(); // UID만 들어있는 배열

  for (const uid of friendUIDs) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) continue;

    const nickname = userDoc.data().nickname || "이름 없음";

    const li = document.createElement('li');
    li.innerHTML = `
      <label>
        <input type="checkbox" value="${nickname}">
        ${nickname}
      </label>
    `;
    modalFriendList.appendChild(li);
  }
}

// 채팅방 친구초대

const inviteModal = document.getElementById("inviteModal");
const inviteFriendList = document.getElementById("inviteFriendList");
const inviteFriendBtn = document.getElementById("inviteFriendBtn");
const confirmInviteBtn = document.getElementById("confirmInviteBtn");
const closeInviteModal = document.getElementById("closeInviteModal");

inviteFriendBtn.addEventListener("click", async () => {
  if (!currentRoomId) return;

  inviteModal.style.display = "block";
  inviteFriendList.innerHTML = '';

  const roomSnap = await getDoc(doc(db, "chatRooms", currentRoomId));
  if (!roomSnap.exists()) {
    alert("채팅방 정보를 불러오지 못했습니다.");
    return;
  }
  const roomData = roomSnap.data();
  const currentMembers = roomData.members || [];

  const friendUIDs = await getFriends();
  let addedAny = false;

  for (const uid of friendUIDs) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) continue;

    const nickname = userDoc.data().nickname;
    if (currentMembers.includes(nickname)) continue;

    const li = document.createElement('li');
    li.innerHTML = `
      <label>
        <input type="checkbox" value="${nickname}">
        ${nickname}
      </label>
    `;
    inviteFriendList.appendChild(li);
    addedAny = true;
  }

  if (!addedAny) {
    const li = document.createElement('li');
    li.textContent = "초대할 수 있는 친구가 없습니다. 먼저 친구를 추가해주세요.";
    li.style.color = "#888";
    li.style.padding = "8px";
    inviteFriendList.appendChild(li);
  }
});

closeInviteModal.addEventListener("click", () => {
  inviteModal.style.display = "none";
});

confirmInviteBtn.addEventListener("click", async () => {
  const selected = [...inviteFriendList.querySelectorAll('input[type="checkbox"]:checked')]
    .map(cb => cb.value);

  if (!currentRoomId || selected.length === 0) return;

  const roomRef = doc(db, "chatRooms", currentRoomId);

  await updateDoc(roomRef, {
    members: arrayUnion(...selected)
  });

  alert("친구가 초대되었습니다.");
  inviteModal.style.display = "none";
});

//음성채팅

// Firebase DB의 참조 경로들

// DOM 요소 가져오기
const startAudioChatBtn = document.getElementById("startAudioChatBtn");
const endAudioChatBtn = document.getElementById("endAudioChatBtn");
const audioChatStatus = document.getElementById("audio-chat-status");

// 상태 변수들
let localStream = null;            // 자신의 오디오 스트림
let peerConnectionsByRoom = {};    // 상대방과의 WebRTC 연결 객체 저장
let isListening = false;           // Firebase 이벤트 중복 리스닝 방지

// 내 오디오 트랙을 PeerConnection에 추가
function attachLocalTracksTo(pc) {
  if (!localStream) {
    console.warn("⚠️ localStream이 없음 (마이크 권한 문제일 수 있음)");
    return;
  }
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
}

// PeerConnection 이벤트 설정 (ICE / 트랙 수신)
function setupPeerConnectionEvents(pc, remoteUserId, iceCandidatesRef) {
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      // ICE 후보 정보를 Firebase에 전송
      push(iceCandidatesRef, {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sender: auth.currentUser.uid,
        receiver: remoteUserId,
      });
    }
  };

  pc.ontrack = (event) => {
    console.log("🎧 ontrack 이벤트 발생 - 오디오 스트림 수신");
    const remoteAudio = new Audio();       // 새로운 오디오 요소 생성
    remoteAudio.srcObject = event.streams[0]; // 상대방 스트림 설정
    remoteAudio.autoplay = true;
    remoteAudio.play().then(() => {
      console.log("🔊 오디오 재생 성공");
    }).catch((err) => {
      console.error("🔇 오디오 재생 실패:", err);
    });
  };
}

// 나보다 UID가 큰 사람과 연결 생성 (Offer 생성)
async function createPeerConnection(remoteUserId, roomId, offersRef, iceCandidatesRef) {
  console.log(`🛠️ createPeerConnection 호출됨: remoteUserId = ${remoteUserId}`);

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  if (!peerConnectionsByRoom[currentRoomId]) {
    peerConnectionsByRoom[currentRoomId] = {};
  } else {
    Object.values(peerConnectionsByRoom[currentRoomId]).forEach(pc => pc.close());
    peerConnectionsByRoom[currentRoomId] = {};
  }

  peerConnectionsByRoom[currentRoomId][remoteUserId] = pc;

  try {
    attachLocalTracksTo(pc);
    setupPeerConnectionEvents(pc, remoteUserId, iceCandidatesRef);

    const offer = await pc.createOffer();       // SDP offer 생성
    await pc.setLocalDescription(offer);        // local SDP 설정

    await push(offersRef, {                     // Firebase에 offer 저장
      type: "offer",
      sdp: offer.sdp,
      sender: auth.currentUser.uid,
      receiver: remoteUserId,
    });
  } catch (err) {
    console.error("❌ createPeerConnection 오류:", err);
  }
}

// 상대방이 보낸 Offer 수신 처리 (Answer 생성)
async function handleReceivedOffer(offerData, iceCandidatesRef, offersRef) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  peerConnectionsByRoom[currentRoomId][offerData.sender] = pc;
  attachLocalTracksTo(pc);
  setupPeerConnectionEvents(pc, offerData.sender, iceCandidatesRef);

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offerData));
    if (pc._queuedCandidates) {
      for (const c of pc._queuedCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      delete pc._queuedCandidates;
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await push(offersRef, {
      type: "answer",
      sdp: answer.sdp,
      sender: auth.currentUser.uid,
      receiver: offerData.sender,
    });
  } catch (err) {
    console.error("❗ handleReceivedOffer 처리 중 오류:", err);
  }
}

// 음성 채팅 시작
async function startVoiceChat() {

  if (!auth.currentUser) return alert("로그인이 필요합니다.");
  const userId = auth.currentUser.uid;

  if (!currentRoomId) return alert("채팅방을 먼저 선택하세요.");

  if (!peerConnectionsByRoom[currentRoomId]) {
    peerConnectionsByRoom[currentRoomId] = {};
  } else {
    Object.values(peerConnectionsByRoom[currentRoomId]).forEach(pc => pc.close());
    peerConnectionsByRoom[currentRoomId] = {};
  }


  const voiceChatUsersRef = ref(database, `voiceChatUsers/${currentRoomId}`);// 음성 채팅 중인 사용자 목록
  const offersRef = ref(database, `voiceChatOffers/${currentRoomId}`);// ICE 후보 정보 저장소
  const iceCandidatesRef = ref(database, `voiceChatCandidates/${currentRoomId}`);// WebRTC Offer/Answer 저장소

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 끊긴 연결 정리
    for (const [uid, pc] of Object.entries(peerConnectionsByRoom[currentRoomId])) {
      if (pc.connectionState === "closed" || pc.iceConnectionState === "disconnected") {
        delete peerConnectionsByRoom[currentRoomId][uid];
      }
    }

    // 기존 사용자 목록 가져오기
    const snapshot = await get(voiceChatUsersRef);
    const existingUserIds = [];
    snapshot.forEach((child) => {
      const remoteUserId = child.key;
      if (remoteUserId !== userId) existingUserIds.push(remoteUserId);
    });

    await set(ref(database, `voiceChatUsers/${currentRoomId}/${userId}`), true); // 현재 사용자 등록

    // tie-break 전략: UID가 작을 때만 연결 시도
    for (const remoteUserId of existingUserIds) {
      if (userId < remoteUserId) {
        await createPeerConnection(remoteUserId, currentRoomId, offersRef, iceCandidatesRef);
      }
    }

    if (!isListening) {
      isListening = true;

      // 기존 offer 처리
      const offersSnapshot = await get(offersRef);
      offersSnapshot.forEach(async (snapshot) => {
        const offerData = snapshot.val();
        if (offerData?.type === "offer" && offerData.receiver === userId && offerData.sender !== userId) {
          await handleReceivedOffer(offerData, iceCandidatesRef, offersRef);
        }
      });

      // 새로운 사용자 접속 감지
      onChildAdded(voiceChatUsersRef, (snapshot) => {
        const remoteUserId = snapshot.key;
        if (remoteUserId !== userId && !peerConnectionsByRoom[currentRoomId][remoteUserId]) {
          if (userId < remoteUserId) {
            createPeerConnection(remoteUserId, currentRoomId, offersRef, iceCandidatesRef);
          }
        }
      });

      // 사용자 나감 감지
      onChildRemoved(voiceChatUsersRef, (snapshot) => {
        const removedId = snapshot.key;
        if (peerConnectionsByRoom[currentRoomId][removedId]) {
          peerConnectionsByRoom[currentRoomId][removedId].close();
          delete peerConnectionsByRoom[currentRoomId][removedId];
        }
      });

      // offer 또는 answer 수신 처리
      onChildAdded(offersRef, async (snapshot) => {
        const offerData = snapshot.val();
        if (!offerData?.type) return;

        if (offerData.type === "offer" && offerData.receiver === userId && offerData.sender !== userId) {
          await handleReceivedOffer(offerData, iceCandidatesRef, offersRef);
        } else if (
          offerData.type === "answer" &&
          offerData.receiver === userId &&
          peerConnectionsByRoom[currentRoomId][offerData.sender]
        ) {
          const pc = peerConnectionsByRoom[currentRoomId][offerData.sender];
          if (!pc.remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(offerData));
          }
        }
      });

      // ICE 후보 수신 시 추가
      onChildAdded(iceCandidatesRef, async (snapshot) => {
        const candidateData = snapshot.val();
        if (
          candidateData.receiver === userId &&
          candidateData.candidate &&
          candidateData.sdpMid !== undefined &&
          candidateData.sdpMLineIndex !== undefined
        ) {
          const pc = peerConnectionsByRoom[currentRoomId][candidateData.sender];
          if (pc) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } else {
              // 📝 remoteDescription이 설정될 때까지 후보를 대기열에 저장
              pc._queuedCandidates = pc._queuedCandidates || [];
              pc._queuedCandidates.push(candidateData);
            }
          }
        }

      });
    }

    audioChatStatus.textContent = "음성 채팅 활성화됨";
  } catch (error) {
    console.error("❗ 음성 채팅 오류:", error);
  }
}

// 음성 채팅 종료 및 정리
function cleanupVoiceChatData() {
  if (!auth.currentUser || !currentRoomId) return;

  const userId = auth.currentUser.uid;
  const offersRef = ref(database, `voiceChatOffers/${currentRoomId}`);
  const iceCandidatesRef = ref(database, `voiceChatCandidates/${currentRoomId}`);
  const usersRef = ref(database, `voiceChatUsers/${currentRoomId}/${userId}`);

  // 사용자 목록 제거
  remove(usersRef);

  // Offer 및 Answer 제거
  get(offersRef).then(snapshot => {
    snapshot.forEach(child => {
      const data = child.val();
      if (data.sender === userId || data.receiver === userId) {
        remove(ref(database, `voiceChatOffers/${currentRoomId}/${child.key}`));
      }
    });
  });

  // ICE 후보 제거
  get(iceCandidatesRef).then(snapshot => {
    snapshot.forEach(child => {
      const data = child.val();
      if (data.sender === userId || data.receiver === userId) {
        remove(ref(database, `voiceChatCandidates/${currentRoomId}/${child.key}`));
      }
    });
  });

  // 연결 닫기
  if (peerConnectionsByRoom[currentRoomId]) {
    Object.values(peerConnectionsByRoom[currentRoomId]).forEach(pc => pc.close());
    peerConnectionsByRoom[currentRoomId] = {};
  }

  audioChatStatus.textContent = "음성 채팅 상태: 대기 중";

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

}

// 버튼 클릭 시 음성 채팅 시작/종료
endAudioChatBtn.addEventListener("click", () => {
  cleanupVoiceChatData();
});

startAudioChatBtn.addEventListener("click", startVoiceChat);

// 창 닫힐 때 정리
window.addEventListener("beforeunload", () => {
  cleanupVoiceChatData();
});


// 파일 업로드 및 공유 파일 다운로드
// DOM 요소 참조
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');

uploadBtn.addEventListener('click', () => {
  if (!currentRoomId) {
    alert("먼저 채팅방을 선택하세요.");
    return;
  }
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  // ✅ Storage 참조 생성
  const fileRef = storageRef(storage, `uploads/${currentRoomId}/${file.name}`);
  const uploadTask = uploadBytesResumable(fileRef, file);

  uploadTask.on('state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      fileNameDisplay.textContent = `업로드 중: ${Math.floor(progress)}%`;
    },
    (error) => {
      console.error('업로드 실패:', error);
      alert('업로드 실패');
      fileNameDisplay.textContent = '';
    },
    async () => {
      try {
        const fileURL = await getDownloadURL(uploadTask.snapshot.ref);

        // ✅ Firestore 문서 생성
        const docRef = doc(firestore, "uploads", `${currentRoomId}_${file.name}`);
        await setDoc(docRef, {
          roomId: currentRoomId,
          fileName: file.name,
          fileURL,
          uploadedAt: serverTimestamp()
        });

        alert('업로드 성공!');
        fileNameDisplay.textContent = `업로드 완료: ${file.name}`;
      } catch (err) {
        console.error("Firestore 저장 실패:", err);
      }
    }
  );
});


document.addEventListener('DOMContentLoaded', () => {
  const fileList = document.getElementById('fileList');
  const showFilesBtn = document.getElementById('showFilesBtn');

  async function loadUploadedFiles() {
    if (!currentRoomId) {
      alert("먼저 채팅방을 선택하세요.");
      return;
    }

    const uploadsRef = collection(firestore, "uploads");
    const q = query(uploadsRef, where("roomId", "==", currentRoomId), orderBy("uploadedAt", "desc"));

    try {
      const querySnapshot = await getDocs(q);
      fileList.innerHTML = "";

      if (querySnapshot.empty) {
        fileList.innerHTML = "<li>업로드된 파일이 없습니다.</li>";
        return;
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = data.fileURL;
        link.textContent = data.fileName;
        link.target = "_blank";
        li.appendChild(link);
        fileList.appendChild(li);
      });
    } catch (error) {
      console.error("파일 목록 불러오기 실패:", error);
      fileList.innerHTML = "<li>파일을 불러오는 데 실패했습니다.</li>";
    }
  }

  // 버튼 클릭 시 함수 연결
  showFilesBtn.addEventListener('click', loadUploadedFiles);
});
// ******************************** 이거 추가하면 처음에 불러오는데 실패했다 뜨는데 F12 누르고 오류 메시지의 링크 누르면 파이어베이스 홈페이지에 색인으로 이동됨 저장 누르고 기다리다가 완료 뜨면 그때부터 파일 목록 보일거야

// 파일 업로드 및 공유 파일 다운로드

// 9. WebRTC 전역 변수 정의 (PeerConnection 관리)
//──────────────────────────────────────────────────────────────────────────────
let videoSender = {};           // 화면 공유/음성 공유 모두 사용
let localStreams = { video: null, screen: null };
let viewerOfferListener = null;
let viewerCandidateListener = null;

// ✅ [추가] 화면 공유 리스너 저장을 위한 전역 변수
let screenUsersListener = null;
let screenCandidatesListener = null;
let screenOffersListener = null;
let screenUsersRemovedListener = null;

function createOrReuseConnection(remoteUserId, roomId, streamType = "screen") {
  if (!peerConnectionsByRoom[roomId]) peerConnectionsByRoom[roomId] = {};
  if (!peerConnectionsByRoom[roomId][remoteUserId]) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const icePath = streamType === "screen"
      ? `screenShareCandidates/${roomId}`
      : `voiceChatCandidates/${roomId}`;
    pc.onicecandidate = event => {
      if (!event.candidate) return;
      push(ref(database, icePath), {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sender: auth.currentUser.uid,
        receiver: remoteUserId
      });
    };
    pc.ontrack = event => {
      const stream = event.streams[0];
      const remoteEl = document.getElementById("remoteVideo");

      if (!remoteEl) {
        console.error("remoteVideo element not found");
        return;
      }

      // ✅ 기존 스트림과 같아도 무조건 새로 적용
      remoteEl.srcObject = null;
      remoteEl.srcObject = stream;

      // ✅ autoplay 정책 우회: muted → true 재지정
      remoteEl.muted = true;
      remoteEl.playsInline = true;

      // ✅ 아주 중요: user gesture가 없는 상태에서도 확실히 재생 요청
      setTimeout(() => {
        remoteEl.play().then(() => {
          console.log("🔊 remoteVideo play() 성공");
        }).catch(err => {
          console.warn("⚠️ remoteVideo play() 실패:", err);
        });
      }, 100);

      remoteEl.style.display = "block";
      document.getElementById("videoContainer").style.display = "flex";
      document.getElementById("videoContainer").style.width = "100%";
    };

    pc._queuedCandidates = [];
    const origAddIce = pc.addIceCandidate.bind(pc);
    pc.addIceCandidate = async candInit => {
      if (!pc.remoteDescription) {
        pc._queuedCandidates.push(candInit);
      } else {
        await origAddIce(new RTCIceCandidate(candInit));
      }
    };
    peerConnectionsByRoom[roomId][remoteUserId] = pc;
  }
  return peerConnectionsByRoom[roomId][remoteUserId];
}


// 12. WebRTC: 화면 공유 시작 / 종료
//──────────────────────────────────────────────────────────────────────────────
const screenShareStatus = document.getElementById("screen-share-status");
const screenVideoEl = document.getElementById("screenVideo");

// 버튼 초기 상태
startScreenShareBtn.disabled = false;
endScreenShareBtn.disabled = false;

// 화면 공유 시작/종료 바인딩
startScreenShareBtn?.addEventListener("click", startScreenShare);
endScreenShareBtn.addEventListener("click", async () => {
  // ── 내가 호스트라면 ──
  if (localStreams.screen) {
    await stopScreenShare();
  }
  // ── 내가 뷰어라면 ──
  else {

    // 2) UI 초기화
    videoContainer.style.display = "none";
    remoteVideo.srcObject = null;
    remoteVideo.style.display = "none";
    screenVideo.style.display = "none";
    localVideo.style.display = "none";

    // 3) 버튼 상태 리셋
    startScreenShareBtn.disabled = false;
    endScreenShareBtn.disabled = true;
    endScreenShareBtn.style.display = "none";

    // 4) PeerConnection 정리 (선택 사항)
    if (peerConnectionsByRoom[currentRoomId]) {
      Object.values(peerConnectionsByRoom[currentRoomId]).forEach(pc => {
        pc.getSenders().forEach(s => s.track && s.track.stop());
        pc.close();
      });
      delete peerConnectionsByRoom[currentRoomId];
    }
  }
});



async function startScreenShare() {
  if (!auth.currentUser) {
    alert("로그인이 필요합니다.");
    return;
  }
  if (!currentRoomId) {
    alert("채팅방을 먼저 선택하세요.");
    return;
  }

  screenSignalingInitialized = false;   // ✅ 여기 한 줄 추가!!

  const myUid = auth.currentUser.uid;
  const nick = sessionStorage.getItem("nickname") || "익명";

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch (err) {
    console.error("getDisplayMedia 오류:", err);
    return alert("화면 공유 권한을 허용해주세요.");
  }

  localStreams.screen = stream;
  screenVideoEl.srcObject = stream;
  localVideo.style.display = "none";
  screenVideoEl.style.display = "block";
  videoContainer.style.display = "flex";

  try { await screenVideoEl.play(); } catch (err) { console.error(err); }

  setupScreenSignalingListeners();

  startScreenShareBtn.disabled = true;
  endScreenShareBtn.disabled = false;
  endScreenShareBtn.style.display = "inline-block";
  screenShareStatus.textContent = "화면 공유: 활성화됨";

  await set(ref(database, `screenShareUsers/${currentRoomId}/${myUid}`), true);

  startScreenViewerListeners();  // ✅ 다시 한 번 강제 실행 (리스너 누락 방지)

  await addDoc(
    collection(db, "chatRooms", currentRoomId, "messages"),
    {
      sender: "[알림]",
      text: `${nick}님이 화면 공유를 시작했습니다.`,
      message: `${nick}님이 화면 공유를 시작했습니다.`,
      type: "screen-share",
      streamType: "screen",        // ✅ 이거 중요!
      isStreamAlert: true,
      createdAt: serverTimestamp(),
      senderUid: myUid
    }
  );
}


async function stopScreenShare() {
  const userId = auth.currentUser?.uid;
  if (!userId || !currentRoomId) return;

  const nick = sessionStorage.getItem("nickname") || "익명";
  const myUid = auth.currentUser.uid; // ✅ 이 줄을 추가

  // (1) Firestore 알림
  try {
    await addDoc(
      collection(db, "chatRooms", currentRoomId, "messages"),
      {
        sender: "[알림]",
        text: `${nick}님이 화면 공유를 종료했습니다.`,
        message: `${nick}님이 화면 공유를 종료했습니다.`,
        type: "screen-share",
        streamType: "screen",
        isStreamAlert: false, // ✅ 종료 알림은 false로 설정
        createdAt: serverTimestamp(),
        senderUid: myUid // ✅ 이제 정상 작동
      }
    );
  } catch (e) {
    console.warn("종료 알림 오류:", e);
  }

  // (2) RTDB에서 node 삭제
  try {
    // ✅ RTDB에서 전체 뷰어 삭제
    await remove(ref(database, `screenShareUsers/${currentRoomId}/${auth.currentUser.uid}`));
  } catch { }

  // (3) UI 초기화
  startScreenShareBtn.disabled = false;
  endScreenShareBtn.disabled = true;
  screenShareStatus.textContent = "화면 공유: 대기 중";

  if (localStreams.screen) {
    localStreams.screen.getTracks().forEach(t => t.stop());
    localStreams.screen = null;
  }
  screenVideoEl.srcObject = null;
  screenVideoEl.style.display = "none";

  const remoteEl = document.getElementById("remoteVideo");
  if (remoteEl) {
    remoteEl.srcObject = null;
    remoteEl.style.display = "none";
  }
  document.getElementById("videoContainer").style.display = "none";

  // (4) PeerConnection 정리
  if (peerConnectionsByRoom[currentRoomId]) {
    Object.values(peerConnectionsByRoom[currentRoomId]).forEach(pc => {
      pc.getSenders().forEach(s => s.track && s.track.stop());
      pc.close();
    });
    delete peerConnectionsByRoom[currentRoomId];
  }

  screenSignalingInitialized = false;

  // (5) RTDB Offers/ICE 후보 정리
  const offersRef = ref(database, `screenShareOffers/${currentRoomId}`);
  const candsRef = ref(database, `screenShareCandidates/${currentRoomId}`);
  try {
    const ofs = await get(offersRef);
    ofs.forEach(ch => {
      const d = ch.val();
      if (d.sender === userId || d.receiver === userId) {
        remove(ref(database, `screenShareOffers/${currentRoomId}/${ch.key}`));
      }
    });
  } catch { }
  try {
    const cs = await get(candsRef);
    cs.forEach(ch => {
      const d = ch.val();
      if (d.sender === userId || d.receiver === userId) {
        remove(ref(database, `screenShareCandidates/${currentRoomId}/${ch.key}`));
      }
    });
  } catch { }
}

// 13. WebRTC: 화면 공유 시그널링 리스너 설정 (호스트용)
//──────────────────────────────────────────────────────────────────────────────
let screenSignalingInitialized = false;
function setupScreenSignalingListeners() {

  const myUid = auth.currentUser.uid;
  const usersRef = ref(database, `screenShareUsers/${currentRoomId}`);
  const candidatesRef = ref(database, `screenShareCandidates/${currentRoomId}`);
  const offersRef = ref(database, `screenShareOffers/${currentRoomId}`);

  // ✅ [수정] 기존 리스너가 있다면 먼저 확실하게 제거
  if (screenUsersListener) off(usersRef, 'child_added', screenUsersListener);
  if (screenCandidatesListener) off(candidatesRef, 'child_added', screenCandidatesListener);
  if (screenOffersListener) off(offersRef, 'child_added', screenOffersListener);
  if (screenUsersRemovedListener) off(usersRef, 'child_removed', screenUsersRemovedListener);

  // (A) 참여자 감지 → Offer 생성 (리스너를 변수에 저장)
  screenUsersListener = onChildAdded(usersRef, async snap => {
    const newUid = snap.key;
    if (!myUid || newUid === myUid) return;

    const pc = createOrReuseConnection(newUid, currentRoomId, "screen");
    const track = localStreams.screen.getVideoTracks()[0];

    if (!videoSender[currentRoomId]) videoSender[currentRoomId] = {};
    if (!videoSender[currentRoomId][newUid]) {
      videoSender[currentRoomId][newUid] = pc.addTrack(track, localStreams.screen);
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await push(offersRef, {
        type: "offer",
        sdp: offer.sdp,
        sender: myUid,
        receiver: newUid,
        streamType: "screen"
      });
    } catch (e) {
      console.warn("Offer 생성 오류:", e);
    }
  });

  // (B) ICE 후보 처리 (리스너를 변수에 저장)
  screenCandidatesListener = onChildAdded(candidatesRef, async snap => {
    const c = snap.val();
    if (!c || !c.sender) return; // 💡 c.sender 가 없는 경우 방지
    const pc = createOrReuseConnection(c.sender, currentRoomId, "screen");
    try {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    } catch (e) {
      console.warn("ICE 후보 추가 오류:", e);
    }
  });

  // (C) 참여자 Answer 처리 (리스너를 변수에 저장)
  screenOffersListener = onChildAdded(offersRef, async snap => {
    const d = snap.val();
    if (!d || d.type !== "answer" || d.receiver !== myUid) return;
    const pc = createOrReuseConnection(d.sender, currentRoomId, "screen");
    if (pc.signalingState === "have-local-offer") {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(d));
      } catch (e) {
        console.warn("Answer setRemoteDescription 오류:", e);
      }
    }
  });

  // (D) 호스트 나갔을 때 자동 종료
  screenUsersRemovedListener = onChildRemoved(ref(database, `screenShareUsers/${currentRoomId}`), snap => {
    const removedUid = snap.key;
    console.log("🔥 onChildRemoved 감지됨:", removedUid, "호스트:", currentScreenHostUid);
    const myUid = auth.currentUser.uid;
    const remoteEl = document.getElementById("remoteVideo");
    const container = document.getElementById("videoContainer");

    console.log("🧪 remoteVideo:", remoteEl);
    console.log("🧪 videoContainer:", container);

    // 내가 뷰어이고, 나간 사람이 호스트일 경우
    if (myUid !== removedUid && removedUid === currentScreenHostUid) {
      console.log("🛑 호스트 종료 감지 → 뷰어 화면 종료 중");

      const remoteEl = document.getElementById("remoteVideo");
      const container = document.getElementById("videoContainer");

      if (remoteEl) {
        remoteEl.pause();
        remoteEl.srcObject?.getTracks().forEach(track => track.stop());
        remoteEl.srcObject = null;
        remoteEl.load();
        remoteEl.classList.add("hidden"); // ✅ CSS로 강제 숨김
      }

      if (container) {
        container.classList.add("hidden"); // ✅ CSS로 강제 숨김
      }

      screenShareStatus.textContent = "화면 공유: 종료됨";
      endScreenShareBtn.style.display = "none";
      startScreenShareBtn.disabled = false;
      endScreenShareBtn.disabled = true;

      if (peerConnectionsByRoom[currentRoomId]) {
        Object.values(peerConnectionsByRoom[currentRoomId]).forEach(pc => pc.close());
        delete peerConnectionsByRoom[currentRoomId];
      }

      currentScreenHostUid = null;
    }
  });
}

// 화면 공유 보기 (뷰어용)
async function viewRemoteScreen() {
  if (!auth.currentUser || !currentRoomId) return alert("로그인 또는 채팅방 선택이 필요합니다.");
  const myUid = auth.currentUser.uid;

  // ✅ 호스트 UID를 DB에서 받아서 저장!
  const usersSnap = await get(ref(database, `screenShareUsers/${currentRoomId}`));
  let hostUid = null;
  usersSnap.forEach(child => {
    if (!hostUid) hostUid = child.key;
  });

  if (!hostUid) return alert("현재 화면 공유 중인 사용자가 없습니다."); // ✅ 추가

  currentScreenHostUid = hostUid;

  startScreenViewerListeners();

  console.log("뷰어가 본 호스트 UID:", currentScreenHostUid);

  await set(ref(database, `screenShareUsers/${currentRoomId}/${myUid}`), true);

  // UI 설정
  remoteVideo.style.display = "block";
  videoContainer.style.display = "flex";
  endScreenShareBtn.style.display = "inline-block";
  startScreenShareBtn.disabled = true;
  endScreenShareBtn.disabled = false;
  screenShareStatus.textContent = "화면 공유: 시청 중";

}

// 화면 공유 보기 함수 전역 바인딩
window.viewRemoteScreen = viewRemoteScreen;

function startScreenViewerListeners() {
  const path = `screenShareUsers/${currentRoomId}`;
  const dbRef = ref(database, path);

  // ✅ 기존 리스너 직접 제거
  if (window._viewerScreenShareRemoveListener) {
    off(dbRef, "child_removed", window._viewerScreenShareRemoveListener);
    window._viewerScreenShareRemoveListener = null;
  }

  // ✅ 새 리스너 등록
  const callback = snap => {
    console.log("🔥 [뷰어] onChildRemoved 이벤트 발생!", snap.key, currentScreenHostUid);
    const removedUid = snap.key;
    const myUid = auth.currentUser.uid;

    if (myUid !== removedUid && removedUid === currentScreenHostUid) {
      console.log("🛑 호스트 종료 감지 → 뷰어 화면 종료 중");

      // UI 정리
      const remoteEl = document.getElementById("remoteVideo");
      remoteEl.srcObject = null;
      remoteEl.style.display = "none";
      document.getElementById("videoContainer").style.display = "none";
      screenShareStatus.textContent = "화면 공유: 종료됨";
      endScreenShareBtn.style.display = "none";
      startScreenShareBtn.disabled = false;
      endScreenShareBtn.disabled = true;

      if (peerConnectionsByRoom[currentRoomId]) {
        Object.values(peerConnectionsByRoom[currentRoomId]).forEach(pc => pc.close());
        delete peerConnectionsByRoom[currentRoomId];
      }

      currentScreenHostUid = null;
    }
  };

  onChildRemoved(dbRef, callback);
  window._viewerScreenShareRemoveListener = callback;
}

//────────────────────────────────────────────
// 📹 화상 공유 (자동 감지 + 안정화 버전)
//────────────────────────────────────────────
let videoStream = null;
let videoPeerConnections = {};
let videoOfferListener = null;
let videoCandidateListener = null;
let currentVideoHostUid = null; // 🔸 화상 공유 시 생성한 newUid 저장용

async function startVideoChat() {
  try {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return alert("로그인이 필요합니다.");
    if (!currentRoomId) return alert("채팅방을 먼저 선택하세요.");

    // 🔸 이전 데이터 정리
    await remove(ref(database, `videoChatOffers/${currentRoomId}`));
    await remove(ref(database, `videoChatCandidates/${currentRoomId}`));

    // 1️⃣ 비디오 스트림 가져오기
    videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    localVideo.srcObject = videoStream;
    localVideo.style.display = "block";
    videoContainer.style.display = "flex";

    // 2️⃣ newUid 생성
    const newRef = push(ref(database, `videoChatUsers/${currentRoomId}`));
    const newUid = newRef.key;
    currentVideoHostUid = newUid;
    await set(newRef, { hostUid: myUid, type: "video", startedAt: Date.now() });

    // 3️⃣ PeerConnection 생성
    const pc = createVideoPeerConnection(newUid, currentRoomId);
    videoStream.getTracks().forEach(track => pc.addTrack(track, videoStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(database, `videoChatCandidates/${currentRoomId}`), {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sender: newUid,
          receiver: "broadcast",
          streamType: "video"
        });
      }
    };

    // 4️⃣ 초기 Offer 생성
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await push(ref(database, `videoChatOffers/${currentRoomId}`), {
      type: "offer",
      sdp: offer.sdp,
      sender: newUid,
      receiver: "broadcast",
      streamType: "video",
      timestamp: Date.now()
    });

    // ✅ 여기 아래에 Firestore 메시지 추가
    const nickname = sessionStorage.getItem("nickname") || "알수없음";
    await addDoc(collection(db, "chatRooms", currentRoomId, "messages"), {
      type: "video-share",
      message: `${nickname}님이 화상 공유를 시작했습니다.`,
      sender: nickname,
      newUid: newUid,
      streamType: "video",
      isStreamAlert: true,
      createdAt: serverTimestamp()
    });
    console.log("✅ Firestore에 화상공유 알림 메시지 등록 완료");

    const lastViewerJoinTimes = {};

    // 5️⃣ 새 뷰어 감지 (onChildAdded + onChildChanged)
    const usersRef = ref(database, `videoChatUsers/${currentRoomId}`);
    const handleViewerJoin = async (snap) => {
      const viewerUid = snap.key;
      const val = snap.val();
      if (!viewerUid || viewerUid === currentVideoHostUid || !val?.joinedAt) return;

      const joinedAt = val.joinedAt;

      if (lastViewerJoinTimes[viewerUid] && joinedAt <= lastViewerJoinTimes[viewerUid]) {
        console.log(`⏩ 중복 접속 무시: ${viewerUid}`);
        return;
      }

      console.log("👀 새 뷰어 감지 or 재접속:", viewerUid, val);
      lastViewerJoinTimes[viewerUid] = joinedAt;

      // ✅ 기존 연결이 남아있다면 닫고 삭제 (중복 PeerConnection 방지)
      if (videoPeerConnections[currentRoomId]?.[viewerUid]) {
        console.log(`♻️ 기존 PeerConnection(${viewerUid}) 정리 후 재생성`);
        try {
          videoPeerConnections[currentRoomId][viewerUid].close();
        } catch (e) {
          console.warn("기존 PC 종료 중 오류:", e);
        }
        delete videoPeerConnections[currentRoomId][viewerUid];
      }

      const pc = createVideoPeerConnection(viewerUid, currentRoomId);

      // 🔐 중복 방지: track 추가 전에 sender 존재 여부 확인
      const alreadyHasVideo = pc.getSenders().some(sender =>
        sender.track?.kind === 'video'
      );

      if (!alreadyHasVideo) {
        videoStream.getTracks().forEach(track => pc.addTrack(track, videoStream));
      }

      // 💡 [핵심 수정] 뷰어에게 보낼 ICE Candidate 핸들러를 여기에 추가합니다.
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(database, `videoChatCandidates/${currentRoomId}`), {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sender: currentVideoHostUid, // 보내는 사람: 호스트의 고유 ID
            receiver: viewerUid,      // 받는 사람: 이 뷰어의 ID
            streamType: "video"
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await push(ref(database, `videoChatOffers/${currentRoomId}`), {
        type: "offer",
        sdp: offer.sdp,
        sender: currentVideoHostUid, // 보내는 사람: 호스트
        receiver: viewerUid,      // 받는 사람: 뷰어
        streamType: "video",
        timestamp: Date.now()
      });
    };

    onChildAdded(usersRef, handleViewerJoin);
    onChildChanged(usersRef, handleViewerJoin);
    // 6️⃣ 뷰어의 answer 수신
    onChildAdded(ref(database, `videoChatOffers/${currentRoomId}`), async snap => {
      const d = snap.val();
      if (d.type !== "answer") return;
      const receiverUid = d.receiver;
      const pc = videoPeerConnections[currentRoomId]?.[receiverUid];
      if (pc && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: "answer", sdp: d.sdp
        }));
        console.log(`✅ 뷰어(${receiverUid})의 answer 적용 완료`);
      }
    });

    // UI 갱신
    videoChatStatus.textContent = "화상 공유: 진행 중";
    startVideoChatBtn.style.display = "none";
    endVideoChatBtn.style.display = "inline-block";
    endVideoChatBtn.onclick = endVideoChat;

  } catch (err) {
    console.error("❌ 화상 공유 시작 오류:", err);
  }
}

// 화상 공유 종료 (호스트)
async function endVideoChat() {
  try {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }

    localVideo.srcObject = null;
    localVideo.style.display = "none";
    remoteVideo.srcObject = null;
    remoteVideo.style.display = "none";
    videoContainer.style.display = "none";

    // 🔸 이전 세션 데이터 정리
    await clearVideoChatData(currentRoomId);

    // ✅ hostNewUid 대신 currentVideoHostUid 사용
    if (videoPeerConnections[currentRoomId]?.[currentVideoHostUid]) {
      videoPeerConnections[currentRoomId][currentVideoHostUid].close();
      delete videoPeerConnections[currentRoomId][currentVideoHostUid];
    }

    currentVideoHostUid = null; // ✅ 정리

    if (videoOfferListener) videoOfferListener();
    if (videoCandidateListener) videoCandidateListener();
    videoOfferListener = null;
    videoCandidateListener = null;

    videoChatStatus.textContent = "화상 공유: 대기 중";
    startVideoChatBtn.style.display = "inline-block";
    endVideoChatBtn.style.display = "none";

    const nickname = sessionStorage.getItem("nickname") || "알수없음";
    await addDoc(collection(db, "chatRooms", currentRoomId, "messages"), {
      type: "system",
      text: `화상 공유를 종료했습니다.`,
      message: `${nickname}님이 화상 공유를 종료했습니다.`,
      sender: nickname,
      createdAt: serverTimestamp()
    });

  } catch (err) {
    console.error("❌ 화상 공유 종료 오류:", err);
  }
}

// 🔔 호스트 종료 감지 리스너 (뷰어용)
function setupVideoHostEndListener() {
  const usersRef = ref(database, `videoChatUsers/${currentRoomId}`);
  const myUid = auth.currentUser?.uid;

  // 🧩 화상공유: 호스트 종료 감지 리스너
  onChildRemoved(ref(database, `videoChatUsers/${currentRoomId}`), snap => {
    const removedUid = snap.key;
    if (removedUid === currentVideoHostUid) {
      console.log("🛑 화상공유 호스트 종료 감지 → 뷰어 종료");

      // 🔹 뷰어 쪽 영상 정리
      remoteVideo.pause();
      remoteVideo.srcObject = null;
      remoteVideo.style.display = "none";
      videoContainer.style.display = "none";

      // 🔹 연결 종료
      if (videoPeerConnections[currentRoomId]) {
        Object.values(videoPeerConnections[currentRoomId]).forEach(pc => pc.close());
        delete videoPeerConnections[currentRoomId];
      }

      // 🔹 UI 상태 복원
      videoChatStatus.textContent = "화상 공유: 종료됨";
      startVideoChatBtn.style.display = "inline-block";
      endVideoChatBtn.style.display = "none";

      currentVideoHostUid = null;
    }
  });
}

//----------------------------------------------------------
// 뷰어: "보기" 버튼 클릭 시 화상 공유 참가 
//----------------------------------------------------------
async function joinVideoChat(hostNewUid) {
  console.log("🎬 joinVideoChat() 실행:", hostNewUid);
  currentVideoHostUid = hostNewUid; // ✅ 호스트 UID 저장 (뷰어 종료 감지용)

  // 🔸 기존 PeerConnection 완전 정리
  if (videoPeerConnections[currentRoomId]) {
    Object.values(videoPeerConnections[currentRoomId]).forEach(pc => pc.close());
    delete videoPeerConnections[currentRoomId];
  }

  // 🔸 Listener 완전 해제
  if (videoOfferListener) { videoOfferListener(); videoOfferListener = null; }
  if (videoCandidateListener) { videoCandidateListener(); videoCandidateListener = null; }

  // 🔸 remoteVideo 완전 초기화 (⚠️ 중요)
  remoteVideo.pause();
  if (remoteVideo.srcObject) {
    remoteVideo.srcObject.getTracks().forEach(t => t.stop());
  }
  remoteVideo.srcObject = null;
  remoteVideo.load();
  remoteVideo.removeAttribute("srcObject");
  remoteVideo.style.display = "none";

  const myUid = auth.currentUser?.uid || sessionStorage.getItem("nickname"); // ✅ 추가

  // ✅ 뷰어의 joinedAt만 갱신해서 호스트 onChildChanged 트리거
  await update(ref(database, `videoChatUsers/${currentRoomId}/${myUid}`), {
    viewerUid: myUid,
    joinedAt: Date.now()
  });

  // 🔸 기존 listener 해제
  if (videoOfferListener) {
    videoOfferListener();
    videoOfferListener = null;
  }
  if (videoCandidateListener) {
    videoCandidateListener();
    videoCandidateListener = null;
  }

  // 🔸 새 PeerConnection 생성
  const pc = createVideoPeerConnection(hostNewUid, currentRoomId);

  const offersRef = ref(database, `videoChatOffers/${currentRoomId}`);
  const candsRef = ref(database, `videoChatCandidates/${currentRoomId}`);

  // ✅ 1️⃣ 기존 Offer가 있는지 먼저 확인해서 연결 시도
  const snapshot = await get(offersRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    for (const key in data) {
      const offer = data[key];
      if (offer.type === "offer" && offer.sender === hostNewUid &&
        (offer.receiver === "broadcast" || offer.receiver === myUid) && !pc.remoteDescription) {
        console.log("📡 기존 offer 감지 → 바로 연결 시도");
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offer.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await push(offersRef, {
          type: "answer",
          sdp: answer.sdp,
          sender: myUid,
          receiver: hostNewUid,
          streamType: "video"
        });

        // 큐에 있던 ICE 후보 적용
        if (pc._queuedCandidates && pc._queuedCandidates.length > 0) {
          for (const cand of pc._queuedCandidates) {
            try {
              await pc.addIceCandidate(cand);
            } catch (e) {
              console.warn("큐에 있던 ICE 후보 추가 실패:", e);
            }
          }
          pc._queuedCandidates = [];
        }
        break;
      }
    }
  }

  // ✅ 2️⃣ 이후에 새 offer가 올라올 수도 있으니 listener도 등록
  videoOfferListener = onChildAdded(offersRef, async (snap) => {
    const offer = snap.val();
    if (offer.type === "offer" && offer.sender === hostNewUid && !pc.remoteDescription) {
      console.log("📡 새 offer 감지 → 연결");
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offer.sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await push(offersRef, {
        type: "answer",
        sdp: answer.sdp,
        sender: myUid,
        receiver: hostNewUid,
        streamType: "video"
      });
    }
  });

  // ICE Candidate 수신
  videoCandidateListener = onChildAdded(candsRef, async (snap) => {
    const c = snap.val();
    if (c.sender === hostNewUid || c.receiver === hostNewUid) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("ICE 후보 추가 실패:", e);
      }
    }
  });

  // UI 처리
  remoteVideo.style.display = "block";
  videoContainer.style.display = "flex";
  endVideoChatBtn.style.display = "inline-block";
  startVideoChatBtn.style.display = "none";

  // 뷰어 종료 버튼 처리
  endVideoChatBtn.onclick = () => {
    leaveVideoChatAsViewer(hostNewUid);
  };

  setupVideoHostEndListener();
}

//----------------------------------------------------------
// PeerConnection 생성 함수 (newUid 기반 - 안정형 개선)
//----------------------------------------------------------
function createVideoPeerConnection(targetUid, roomId) {
  if (!videoPeerConnections[roomId]) videoPeerConnections[roomId] = {};

  // ✅ 이미 존재하면 반환
  if (videoPeerConnections[roomId][targetUid]) {
    console.warn(`⚠️ PeerConnection for ${targetUid} already exists.`);
    return videoPeerConnections[roomId][targetUid];
  }

  // 🔧 여기서 미리 선언
  let pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // ICE 후보 큐잉 처리
  pc._queuedCandidates = [];
  const origAddIce = pc.addIceCandidate.bind(pc);
  pc.addIceCandidate = async candInit => {
    if (!pc.remoteDescription) {
      pc._queuedCandidates.push(candInit);
    } else {
      await origAddIce(new RTCIceCandidate(candInit));
    }
  };

  // ✅ ontrack 이벤트 핸들러 (안정화 버전)
  pc.ontrack = (event) => {
    console.log("📹 [화상공유] ontrack 발생!");
    const stream = event.streams[0];
    const remoteVideo = document.getElementById("remoteVideo");

    // 🧹 기존 스트림 정리
    if (remoteVideo.srcObject && remoteVideo.srcObject !== stream) {
      console.log("♻️ 기존 스트림 종료 및 새 스트림 교체");
      try { remoteVideo.pause(); } catch { }
      remoteVideo.srcObject.getTracks().forEach(t => t.stop());
      remoteVideo.srcObject = null;
      remoteVideo.load();
    }

    // ✅ 새 스트림 적용
    remoteVideo.srcObject = stream;
    remoteVideo.muted = true;
    remoteVideo.playsInline = true;
    remoteVideo.autoplay = true; // 🔹 명시적 autoplay 추가

    // ✅ 브라우저 autoplay 정책 회피용
    setTimeout(() => {
      remoteVideo.srcObject = stream;
      remoteVideo.muted = true;
      remoteVideo.playsInline = true;
      remoteVideo.style.display = "block";
      videoContainer.style.display = "flex";
      remoteVideo.play().catch(e => console.warn("⚠️ play 실패:", e));
    }, 200);
  };

  videoPeerConnections[roomId][targetUid] = pc;
  return pc;
}

//----------------------------------------------------------
// 📡 채팅창 "보기" 버튼 처리 (newUid 기반)
//----------------------------------------------------------
function setupVideoShareListener() {
  const chatMessages = document.getElementById("chatMessages");

  onSnapshot(
    query(collection(db, "chatRooms", currentRoomId, "messages"), orderBy("createdAt", "asc")),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const data = change.doc.data();

        if (data.type === "video-share" && data.isStreamAlert && data.newUid) {
          const wrapper = document.createElement("div");
          wrapper.classList.add("chat-message", "system-message");

          const bubble = document.createElement("div");
          bubble.classList.add("bubble");
          bubble.innerHTML = `<strong>[알림]</strong> ${data.message}`;

          const btn = document.createElement("button");
          btn.textContent = "보기";
          btn.classList.add("btn", "btn-sm");
          btn.style.marginLeft = "8px";

          // 👁 newUid 기반으로 join
          btn.addEventListener("click", () => joinVideoChat(data.newUid));

          bubble.appendChild(btn);
          wrapper.appendChild(bubble);
          chatMessages.appendChild(wrapper);
        }
      });
    }
  );
}

// ✅ 뷰어 종료 전용 함수 
async function leaveVideoChatAsViewer(hostNewUid) {
  console.log("👋 뷰어 화상 공유 종료");

  // 0️⃣ 현재 RoomId와 내 UID 확보
  if (!currentRoomId) return;
  const myUid = auth.currentUser?.uid || sessionStorage.getItem("nickname");

  // 1️⃣ PeerConnection 정리
  if (videoPeerConnections[currentRoomId]?.[hostNewUid]) {
    videoPeerConnections[currentRoomId][hostNewUid].close();
    delete videoPeerConnections[currentRoomId][hostNewUid];
  }

  // 🔸 혹시 남아있는 다른 연결도 모두 정리
  if (videoPeerConnections[currentRoomId]) {
    Object.values(videoPeerConnections[currentRoomId]).forEach(pc => pc.close());
    delete videoPeerConnections[currentRoomId];
  }

  // 2️⃣ 리스너 해제
  if (videoOfferListener) {
    videoOfferListener();
    videoOfferListener = null;
  }
  if (videoCandidateListener) {
    videoCandidateListener();
    videoCandidateListener = null;
  }

  // 3️⃣ UI 정리
  if (remoteVideo.srcObject) {
    remoteVideo.srcObject.getTracks().forEach(t => t.stop());
  }
  remoteVideo.pause();
  remoteVideo.srcObject = null;
  remoteVideo.load();
  remoteVideo.onloadedmetadata = null;
  remoteVideo.style.display = "none";

  videoContainer.style.display = "none";
  videoChatStatus.textContent = "화상 공유: 대기 중";

  // 화상 공유용 버튼 상태 복귀
  startVideoChatBtn.style.display = "inline-block";
  endVideoChatBtn.style.display = "none";

  // 4️⃣ 뷰어가 남긴 offer/answer/candidate + host의 브로드캐스트 offer(receiver=null) 정리
  const offersRef = ref(database, `videoChatOffers/${currentRoomId}`);
  const candsRef = ref(database, `videoChatCandidates/${currentRoomId}`);

  try {
    const offersSnap = await get(offersRef);
    offersSnap.forEach(child => {
      const val = child.val();
      if (
        val.sender === myUid ||
        val.receiver === myUid ||
        val.receiver === null // 🧠 host가 뿌린 offer도 같이 정리!
      ) {
        remove(ref(database, `videoChatOffers/${currentRoomId}/${child.key}`));
      }
    });

    const candsSnap = await get(candsRef);
    candsSnap.forEach(child => {
      const val = child.val();
      if (val.sender === myUid || val.receiver === myUid) {
        remove(ref(database, `videoChatCandidates/${currentRoomId}/${child.key}`));
      }
    });
  } catch (err) {
    console.warn("뷰어 signaling 정리 오류:", err);
  }
}

//----------------------------------------------------------
// 버튼 연결
//----------------------------------------------------------
startVideoChatBtn.addEventListener("click", startVideoChat);

// ✅ 호스트 종료 시 모든 뷰어도 종료되게 수정
async function clearVideoChatData(roomId) {
  try {
    const usersRef = ref(database, `videoChatUsers/${roomId}`);
    const usersSnap = await get(usersRef);

    if (usersSnap.exists()) {
      usersSnap.forEach(child => {
        remove(ref(database, `videoChatUsers/${roomId}/${child.key}`));
      });
      console.log("✅ 호스트 종료: videoChatUsers 하위 개별 삭제 완료 (뷰어 감지용)");
    } else {
      console.log("ℹ️ videoChatUsers 하위 없음 (이미 정리됨)");
    }

    // Offer / Candidate도 개별 삭제
    await remove(ref(database, `videoChatOffers/${roomId}`));
    await remove(ref(database, `videoChatCandidates/${roomId}`));
    console.log("✅ 화상 공유 관련 데이터 삭제 완료");
  } catch (e) {
    console.warn("❌ clearVideoChatData 오류:", e);
  }
}
