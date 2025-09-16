<<<<<<< HEAD
import { auth, db, storage } from './firebase-config.js';
=======
import { auth, db } from './firebase-config.js';
>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
<<<<<<< HEAD
  updateProfile
=======
  onAuthStateChanged
>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
  setDoc, doc, getDoc,
  query, where, getDocs, collection
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

<<<<<<< HEAD
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

=======
>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4
// ✅ 닉네임 유효성 검사
function isValidNickname(nickname) {
  const regex = /^[a-zA-Z0-9가-힣_]{1,20}$/;
  return regex.test(nickname);
}

// ✅ 닉네임 중복 검사
async function isNicknameTaken(nickname) {
  const q = query(collection(db, "users"), where("nickname", "==", nickname));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// ✅ 회원가입 처리
document.addEventListener('DOMContentLoaded', () => {
  const signupSubmit = document.getElementById('signupSubmit');
  if (signupSubmit) {
    signupSubmit.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        alert("이메일과 비밀번호를 입력하세요.");
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
<<<<<<< HEAD
        const user = userCredential.user;   // ✅ 이제 user.uid 사용 가능
=======
        const user = userCredential.user;
>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4
        window.newUser = user;

        // ✅ 닉네임 입력 모달 표시
        document.getElementById('nicknameModal').style.display = 'flex';
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          alert('이미 가입된 이메일입니다. 로그인해주세요.');
        } else {
          alert(`회원가입 실패: ${error.message}`);
        }
      }
    });
  }
});

// ✅ 로그인 처리
const loginSubmit = document.getElementById('loginSubmit');
if (loginSubmit) {
  loginSubmit.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      alert('이메일과 비밀번호를 입력하세요.');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ 닉네임 확인
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const nickname = snap.exists() ? snap.data().nickname : null;

      alert(`${nickname || user.email}님, 로그인 성공!`);

      // ✅ 닉네임 없으면 다시 입력받기
      if (!nickname || nickname.trim() === "" || nickname === "20") {
        window.existingUser = user;
        document.getElementById('nicknameModal').style.display = 'flex';
      } else {
        // ✅ 닉네임 sessionStorage 저장
        sessionStorage.setItem('nickname', nickname);
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert(`로그인 실패: ${error.message}`);
    }
  });
}

<<<<<<< HEAD
// ✅ 사용자 정보 Firestore + Storage에 저장
async function saveUserProfile(user, nickname, file = null) {
  try {
    let photoURL = null;

    if (file) {
      console.log("업로드 파일:", file.name, file.size, file.type);

      if (file.size === 0) {
        alert("선택한 파일이 비어 있습니다. 다시 시도해주세요.");
        return;
      }

      const ext = file.name.split('.').pop(); // 확장자 추출 (png, jpg 등)
      const fileRef = storageRef(storage, `profilePhotos/${user.uid}/profile.${ext}`);
      await uploadBytes(fileRef, file);

      // 🔹 여기서는 const 사용하지 말고 그냥 할당
      photoURL = await getDownloadURL(fileRef);

      // Firebase Auth 프로필 업데이트
      await updateProfile(user, { photoURL });
    }

    const userDoc = {
      email: user.email,
      nickname: nickname,
      createdAt: new Date(),
    };

    if (photoURL) {
      userDoc.photoURL = photoURL; // Firestore에도 저장
    }

    await setDoc(doc(db, "users", user.uid), userDoc, { merge: true });

    alert("닉네임 저장 완료!");
    document.getElementById("nicknameModal").style.display = "none";
    window.location.href = "index.html";
  } catch (error) {
    alert("닉네임 저장 실패: " + error.message);
  }
}

// ✅ 닉네임 + 프로필 저장 버튼
=======
// ✅ 닉네임 + 프로필 저장
>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4
const saveNicknameBtn = document.getElementById('saveNicknameBtn');
if (saveNicknameBtn) {
  saveNicknameBtn.addEventListener('click', async () => {
    const nickname = document.getElementById('nicknameInput').value.trim();
    const user = window.newUser || window.existingUser;
    const fileInput = document.getElementById('profileImage');
<<<<<<< HEAD
=======
    let photoURL = null;
>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4

    if (!nickname || !user) return;

    if (!isValidNickname(nickname)) {
      alert('닉네임은 한글/영문/숫자/밑줄(_)만 사용 가능하며 최대 20자까지 입력할 수 있습니다.');
      return;
    }

    const taken = await isNicknameTaken(nickname);
    if (taken) {
      alert('이미 사용 중인 닉네임입니다.');
      return;
    }

<<<<<<< HEAD
    const file = fileInput?.files[0] || null;
    await saveUserProfile(user, nickname, file);
  });
}

=======
    // ✅ 이미지 파일을 base64로 변환 (자동 리사이즈 적용)
    if (fileInput && fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = async function () {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const size = 100; // ✅ 100x100 고정 크기
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const resizedBase64 = canvas.toDataURL('image/png', 0.8);
          await saveUserProfile(user, nickname, resizedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      await saveUserProfile(user, nickname, null);
    }
  });
}

// ✅ 사용자 정보 Firestore에 저장
async function saveUserProfile(user, nickname, photoURL = null) {
  try {
    const userDoc = {
      email: user.email,
      nickname: nickname,
      createdAt: new Date()
    };

    if (photoURL) {
      userDoc.photoURL = photoURL;
    }

    await setDoc(doc(db, 'users', user.uid), userDoc, { merge: true });

    alert("닉네임 저장 완료!");
    document.getElementById('nicknameModal').style.display = 'none';
    window.location.href = 'index.html';
  } catch (error) {
    alert("닉네임 저장 실패: " + error.message);
  }
}

>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4
// ✅ 비밀번호 재설정 처리
const resetPassword = document.getElementById('resetPassword');
if (resetPassword) {
  resetPassword.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    if (!email) {
      alert('이메일을 입력하세요.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('비밀번호 재설정 메일이 전송되었습니다.');
    } catch (error) {
      alert(`비밀번호 재설정 실패: ${error.message}`);
    }
  });
}
