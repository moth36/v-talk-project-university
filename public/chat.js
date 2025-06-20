// Firebase 모듈 불러오기 (ESM 방식으로 웹에서 CDN으로 직접 불러옴)
import { auth, db } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase, ref, push, onChildAdded, onChildRemoved, set, remove, get
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 앱 초기화 및 서비스 객체 생성
const app = initializeApp(firebaseConfig);
const database = getDatabase(app); // Realtime Database 인스턴스
const auth = getAuth(app);         // 인증 인스턴스

// Firebase DB의 참조 경로들
const messagesRef = ref(database, "messages");               // 메시지 목록 경로
const voiceChatUsersRef = ref(database, "voiceChatUsers");   // 음성 채팅 중인 사용자 목록
const iceCandidatesRef = ref(database, "voiceChatCandidates"); // ICE 후보 정보 저장소
const offersRef = ref(database, "voiceChatOffers");          // WebRTC Offer/Answer 저장소

// DOM 요소 가져오기
const nicknameDisplay = document.getElementById("current-user");
const startAudioChatBtn = document.getElementById("startAudioChatBtn");
const endAudioChatBtn = document.getElementById("endAudioChatBtn");
const audioChatStatus = document.getElementById("audio-chat-status");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const scrollContainer = document.getElementById("chat-container");
const messagesContainer = document.getElementById("messages");
const newMessageAlert = document.getElementById("new-message-alert");

// 상태 변수들
let currentUser = "Anonymous";     // 현재 사용자 표시용 이름
let localStream = null;            // 자신의 오디오 스트림
let peerConnections = {};          // 상대방과의 WebRTC 연결 객체 저장
let shouldScrollBottom = true;     // 자동 스크롤 여부
let isListening = false;           // Firebase 이벤트 중복 리스닝 방지

// 사용자 로그인 상태 변화 감지
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 로그인 상태: 사용자 이름 또는 닉네임 설정
    currentUser = sessionStorage.getItem("nickname") || user.displayName || user.email;
    nicknameDisplay.textContent = `${currentUser}`;
    startAudioChatBtn.disabled = false;
    endAudioChatBtn.disabled = false;
  } else {
    // 비로그인 상태
    currentUser = "익명";
    nicknameDisplay.textContent = "익명";
    startAudioChatBtn.disabled = true;
    endAudioChatBtn.disabled = true;
  }
});

// 메시지 전송 함수
function sendMessage() {
  const message = messageInput.value.trim();
  if (message === "") return; // 빈 메시지 무시

  // Firebase에 메시지 푸시
  push(messagesRef, {
    user: currentUser,
    text: message,
    timestamp: Date.now(),
  });
  messageInput.value = ""; // 입력창 초기화
}

// Enter 키 또는 버튼 클릭으로 메시지 전송
messageInput.addEventListener("keydown", (e) => e.key === "Enter" && sendMessage());
sendBtn.addEventListener("click", sendMessage);

// 스크롤 상태 감지: 아래에 있지 않으면 "새 메시지" 알림 표시
scrollContainer.addEventListener("scroll", () => {
  const nearBottom =
    scrollContainer.scrollHeight - scrollContainer.scrollTop <=
    scrollContainer.clientHeight + 10;
  shouldScrollBottom = nearBottom;
  if (nearBottom && newMessageAlert) newMessageAlert.style.display = "none";
});

function loadChatMessages(roomId) {
  const messagesRef = collection(db, "chatRooms", roomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = '';
    const myNickname = sessionStorage.getItem("nickname");

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const messageWrapper = document.createElement('div');
      const bubble = document.createElement('div');

      // 말풍선 스타일 지정
      bubble.classList.add('chat-bubble');
      bubble.textContent = data.text;

      // 상대방인지 본인인지 구분
      if (data.sender === myNickname) {
        messageWrapper.classList.add('chat-message', 'me');
      } else {
        messageWrapper.classList.add('chat-message', 'you');
      }

      messageWrapper.appendChild(bubble);
      chatMessages.appendChild(messageWrapper);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}


// 새 메시지 추가 시 화면에 표시
onChildAdded(messagesRef, (snapshot) => {
  const data = snapshot.val();
  const messageElement = document.createElement("div");
  messageElement.textContent = `${data.user}: ${data.text}`;
  messageElement.classList.add(
    data.user === currentUser ? "my-message" : "other-message"
  );
  messagesContainer.appendChild(messageElement);

  // 스크롤 처리
  if (shouldScrollBottom) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  } else if (newMessageAlert) {
    newMessageAlert.style.display = "block";
  }
});

// "새 메시지 알림" 클릭 시 자동 스크롤
if (newMessageAlert) {
  newMessageAlert.addEventListener("click", () => {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    newMessageAlert.style.display = "none";
    shouldScrollBottom = true;
  });
}

// 내 오디오 트랙을 PeerConnection에 추가
function attachLocalTracksTo(pc) {
  if (!localStream) {
    console.warn("⚠️ localStream이 없음 (마이크 권한 문제일 수 있음)");
    return;
  }
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
}

// PeerConnection 이벤트 설정 (ICE / 트랙 수신)
function setupPeerConnectionEvents(pc, remoteUserId) {
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
async function createPeerConnection(remoteUserId) {
  console.log(`🛠️ createPeerConnection 호출됨: remoteUserId = ${remoteUserId}`);

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  peerConnections[remoteUserId] = pc;

  try {
    attachLocalTracksTo(pc);
    setupPeerConnectionEvents(pc, remoteUserId);

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
async function handleReceivedOffer(offerData) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  peerConnections[offerData.sender] = pc;
  attachLocalTracksTo(pc);
  setupPeerConnectionEvents(pc, offerData.sender);

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offerData));
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

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 끊긴 연결 정리
    for (const [uid, pc] of Object.entries(peerConnections)) {
      if (pc.connectionState === "closed" || pc.iceConnectionState === "disconnected") {
        delete peerConnections[uid];
      }
    }

    // 기존 사용자 목록 가져오기
    const snapshot = await get(voiceChatUsersRef);
    const existingUserIds = [];
    snapshot.forEach((child) => {
      const remoteUserId = child.key;
      if (remoteUserId !== userId) existingUserIds.push(remoteUserId);
    });

    await set(ref(database, `voiceChatUsers/${userId}`), true); // 현재 사용자 등록

    // tie-break 전략: UID가 작을 때만 연결 시도
    for (const remoteUserId of existingUserIds) {
      if (userId < remoteUserId) {
        await createPeerConnection(remoteUserId);
      }
    }

    if (!isListening) {
      isListening = true;

      // 기존 offer 처리
      const offersSnapshot = await get(offersRef);
      offersSnapshot.forEach(async (snapshot) => {
        const offerData = snapshot.val();
        if (offerData?.type === "offer" && offerData.receiver === userId && offerData.sender !== userId) {
          await handleReceivedOffer(offerData);
        }
      });

      // 새로운 사용자 접속 감지
      onChildAdded(voiceChatUsersRef, (snapshot) => {
        const remoteUserId = snapshot.key;
        if (remoteUserId !== userId && !peerConnections[remoteUserId]) {
          if (userId < remoteUserId) {
            createPeerConnection(remoteUserId);
          }
        }
      });

      // 사용자 나감 감지
      onChildRemoved(voiceChatUsersRef, (snapshot) => {
        const removedId = snapshot.key;
        if (peerConnections[removedId]) {
          peerConnections[removedId].close();
          delete peerConnections[removedId];
        }
      });

      // offer 또는 answer 수신 처리
      onChildAdded(offersRef, async (snapshot) => {
        const offerData = snapshot.val();
        if (!offerData?.type) return;

        if (offerData.type === "offer" && offerData.receiver === userId && offerData.sender !== userId) {
          await handleReceivedOffer(offerData);
        } else if (
          offerData.type === "answer" &&
          offerData.receiver === userId &&
          peerConnections[offerData.sender]
        ) {
          const pc = peerConnections[offerData.sender];
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
          const pc = peerConnections[candidateData.sender];
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
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
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  // 사용자 목록 제거
  remove(ref(database, `voiceChatUsers/${userId}`));

  // Offer 및 Answer 제거
  get(offersRef).then(snapshot => {
    snapshot.forEach(child => {
      const data = child.val();
      if (data.sender === userId || data.receiver === userId) {
        remove(ref(database, `voiceChatOffers/${child.key}`));
      }
    });
  });

  // ICE 후보 제거
  get(iceCandidatesRef).then(snapshot => {
    snapshot.forEach(child => {
      const data = child.val();
      if (data.sender === userId || data.receiver === userId) {
        remove(ref(database, `voiceChatCandidates/${child.key}`));
      }
    });
  });

  // 연결 닫기
  Object.values(peerConnections).forEach((pc) => pc.close());
  peerConnections = {};

  audioChatStatus.textContent = "음성 채팅 상태: 대기 중";
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








const activeUsersList = document.getElementById("active-users-list");

// 사용자 목록 UI 업데이트 함수
function updateActiveUserList(snapshot) {
  activeUsersList.innerHTML = ""; // 기존 리스트 초기화

  snapshot.forEach((child) => {
    const uid = child.key;
    const box = document.createElement("div");
    box.className = "user-box";
    box.textContent = uid === auth.currentUser?.uid ? `${currentUser} (나)` : uid;
    activeUsersList.appendChild(box);
  });
}

// 사용자 목록 실시간 감지
onChildAdded(voiceChatUsersRef, () => {
  get(voiceChatUsersRef).then(updateActiveUserList);
});

onChildRemoved(voiceChatUsersRef, () => {
  get(voiceChatUsersRef).then(updateActiveUserList);
});


const chatUsersList = document.getElementById("chat-users-list"); // 유저 목록 표시 컨테이너

// 로그인된 유저들의 닉네임을 배열로 가져오기
const userList = nicknameDisplay.textContent.split(", "); // ["user1", "user2", "user3"]

// 유저 목록에 박스를 추가하는 함수
function updateUserList() {
  chatUsersList.innerHTML = ""; // 기존에 있던 유저 목록을 초기화

  // 각 유저에 대해 박스를 만들어서 표시
  userList.forEach((nickname) => {
    const box = document.createElement("div");
    box.className = "user-box"; // 스타일을 위한 클래스 추가
    box.textContent = `${nickname}`; // 닉네임 텍스트를 추가

    // 유저 박스를 목록에 추가
    chatUsersList.appendChild(box);
  });
}

// 유저 목록 업데이트 실행
updateUserList();