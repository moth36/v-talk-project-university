import { auth, db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

export { refreshFriendRequests, refreshFriendList };

// 친구 요청 보내기
export async function sendFriendRequest(targetNickname) {
    const user = auth.currentUser;
    if (!user) return alert("로그인이 필요합니다.");

    const myDoc = await getDoc(doc(db, 'users', user.uid));
    const myNickname = myDoc.exists() ? myDoc.data().nickname : null;

    if (myNickname === targetNickname) {
        alert("자기 자신에게 친구 요청은 안됩니다.");
        return;
    }

    const q = query(collection(db, "users"), where("nickname", "==", targetNickname));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        alert("유저를 찾을 수 없습니다.");
        return;
    }

    const targetUser = snapshot.docs[0];
    const targetUserId = targetUser.id;

    await updateDoc(doc(db, "users", targetUserId), {
        friendRequests: arrayUnion(user.uid)
    });

    alert("친구 요청 전송 완료!");
}

// 친구 요청 가져오기
export async function getFriendRequests() {
    const user = auth.currentUser;
    if (!user) return [];

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() ? userDoc.data().friendRequests || [] : [];
}

// 친구 요청 수락
export async function acceptFriendRequest(requestUid) {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion(requestUid),
        friendRequests: arrayRemove(requestUid)
    });

    await updateDoc(doc(db, "users", requestUid), {
        friends: arrayUnion(user.uid)
    });
}

// 친구 요청 거절
export async function declineFriendRequest(requestUid) {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
        friendRequests: arrayRemove(requestUid)
    });
}

// 친구 목록 가져오기 (유저 문서 friends 배열 기반)
export async function getFriends() {
    const user = auth.currentUser;
    if (!user) return [];

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() ? userDoc.data().friends || [] : [];
}

// 친구 요청 UI 갱신
async function refreshFriendRequests() {
    const requests = await getFriendRequests();
    const listEl = document.getElementById('friendRequests');
    if (!listEl) return;

    listEl.innerHTML = '';

    for (const uid of requests) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        const nickname = userDoc.exists() ? userDoc.data().nickname : "알 수 없음";

        const li = document.createElement('li');
        li.textContent = `${nickname} 님`;

        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = "수락";
        acceptBtn.addEventListener('click', async () => {
            await acceptFriendRequest(uid);
            refreshFriendRequests();
            refreshFriendList();
        });

        const declineBtn = document.createElement('button');
        declineBtn.textContent = "거절";
        declineBtn.addEventListener('click', async () => {
            await declineFriendRequest(uid);
            refreshFriendRequests();
        });

        li.appendChild(acceptBtn);
        li.appendChild(declineBtn);
        listEl.appendChild(li);
    }
}

// 친구 목록 UI 갱신 (실시간)
function refreshFriendList() {
    const user = auth.currentUser;
    if (!user) return;

    const listEl = document.getElementById('friendList');
    if (!listEl) return;

    const userDocRef = doc(db, 'users', user.uid);

    // 실시간 반영
    onSnapshot(userDocRef, async (snapshot) => {
        listEl.innerHTML = '';

        const friends = snapshot.exists() ? snapshot.data().friends || [] : [];

        for (const uid of friends) {
            const friendDoc = await getDoc(doc(db, 'users', uid));
            const nickname = friendDoc.exists() ? friendDoc.data().nickname : "알 수 없음";

            const li = document.createElement('li');
            li.textContent = nickname;
            listEl.appendChild(li);
        }
    });
}

// 자동으로 친구 요청/목록 갱신 시작
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        // ✅ 친구 요청 목록 UI 초기 로딩
        refreshFriendRequests();

        // ✅ 친구 요청 실시간 감지 리스너
        onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
                refreshFriendRequests(); // 요청 수가 바뀌면 목록 갱신
            }
        });

        // ✅ 친구 목록 실시간 반영
        refreshFriendList();
    }
});

