import { auth, db, storage } from './firebase-config.js';
import {
  deleteUser,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll }
  from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";


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

  // ✅ 프로필 사진 변경 (Storage 방식)
  changePhotoBtn.addEventListener('click', async () => {
    const file = profilePhotoInput.files[0];
    if (!file) {
      alert("사진을 선택하세요.");
      return;
    }

    try {
      const ext = file.name.split('.').pop(); // 확장자 추출 (png, jpg 등)
      const fileRef = storageRef(storage, `profilePhotos/${user.uid}/profile.${ext}`);
      await uploadBytes(fileRef, file);
      const photoURL = await getDownloadURL(fileRef);

      // Firestore + Authentication 업데이트
      await updateDoc(doc(db, 'users', user.uid), { photoURL });
      await updateProfile(user, { photoURL });

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
    const currentUser = auth.currentUser;
    if (!currentUser || !password) return;

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // --- A. Firestore에 저장된 photoURL로 '정확한 파일' 먼저 삭제 (루트/옛경로 대응)
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(docRef);
        const photoURL = snap.exists() ? snap.data().photoURL : null;
        if (photoURL) {
          const urlRef = storageRef(storage, photoURL); // URL 기반 참조
          await deleteObject(urlRef);
          console.log('photoURL 파일 삭제 완료');
        }
      } catch (e) {
        console.warn('photoURL 기반 삭제 실패(없거나 권한 문제일 수 있음):', e.message);
      }

      // --- B. uid 폴더 안의 잔여 파일 일괄 삭제 (png/jpg/여러 버전 모두)
      try {
        const folderRef = storageRef(storage, `profilePhotos/${currentUser.uid}/`);
        const { items } = await listAll(folderRef);
        await Promise.all(items.map(item => deleteObject(item)));
        console.log('UID 폴더 내 잔여 파일 삭제 완료');
      } catch (e) {
        console.warn('UID 폴더 비우기 실패(비어있을 수 있음):', e.message);
      }

      // --- C. Firestore 문서 삭제
      await deleteDoc(doc(db, 'users', currentUser.uid));

      // --- D. Auth 계정 삭제
      await deleteUser(currentUser);

      alert("계정이 완전히 삭제되었습니다.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("계정 삭제 실패:", err.message);
      alert("계정 삭제 실패: " + err.message);
    }
  });

  // ✅ 메인 화면으로 돌아가기
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});
