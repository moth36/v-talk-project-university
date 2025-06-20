import { auth, db } from './firebase-config.js';
import {
  deleteUser,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Base64로 변환하는 함수
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// ---------------------- 계정 관리 ----------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  const nicknameInput = document.getElementById('newNickname');
  const changeBtn = document.getElementById('changeNicknameBtn');
  const deleteBtn = document.getElementById('deleteAccountBtn');
  const backBtn = document.getElementById('backBtn');
  const profilePhotoInput = document.getElementById('profilePhoto');
  const changePhotoBtn = document.getElementById('changePhotoBtn');

  // ✅ 프로필 사진 변경 (Firestore 방식)
  changePhotoBtn.addEventListener('click', async () => {
    const file = profilePhotoInput.files[0];
    if (!file) {
      alert("사진을 선택하세요.");
      return;
    }

    try {
      // ✅ 파일 크기 확인 (1MB 이하 권장)
      if (file.size > 1 * 1024 * 1024) {
        alert("파일 크기가 너무 큽니다. 1MB 이하로 줄여주세요.");
        return;
      }

      // ✅ Base64로 변환
      const base64Image = await toBase64(file);

      // ✅ Firestore에 저장
      await updateDoc(doc(db, 'users', user.uid), { photoURL: base64Image });
      alert("프로필 사진이 변경되었습니다.");
    } catch (err) {
      console.error("프로필 사진 변경 실패:", err);
      alert("프로필 사진 변경에 실패했습니다.");
    }
  });

  // ✅ 닉네임 변경
  changeBtn.addEventListener('click', async () => {
    const newNickname = nicknameInput.value.trim();
    if (!newNickname) {
      alert("닉네임을 입력하세요.");
      return;
    }

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const nicknameExists = usersSnapshot.docs.some(docSnap => {
        const data = docSnap.data();
        return data.nickname === newNickname && docSnap.id !== user.uid;
      });

      if (nicknameExists) {
        alert("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), { nickname: newNickname });
      alert("닉네임이 변경되었습니다.");
      sessionStorage.setItem('nickname', newNickname);
      nicknameInput.value = '';
    } catch (err) {
      console.error("닉네임 변경 실패:", err);
      alert("변경 실패");
    }
  });

  // ✅ 계정 삭제
  deleteBtn.addEventListener('click', async () => {
    const password = prompt("비밀번호를 입력하세요.");
    const user = auth.currentUser;

    if (user && password) {
      const credential = EmailAuthProvider.credential(user.email, password);
      try {
        await reauthenticateWithCredential(user, credential);
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteUser(user);

        alert("계정이 완전히 삭제되었습니다.");
        window.location.href = "index.html";
      } catch (err) {
        console.error("계정 삭제 실패:", err.message);
        alert("계정 삭제 실패: " + err.message);
      }
    }
  });

  // ✅ 메인 화면으로 돌아가기
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});
