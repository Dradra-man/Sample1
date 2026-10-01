import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5afC7FhyMfCm2N7VWwv-JzKOhAxsY3_g",
  authDomain: "test-70aa9.firebaseapp.com",
  projectId: "test-70aa9",
  storageBucket: "test-70aa9.firebasestorage.app",
  messagingSenderId: "751144429832",
  appId: "1:751144429832:web:84e1277596e6bbe558a4bd",
  measurementId: "G-CRK7EZDKMC",
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const authView = $("auth-view");
const appView = $("app-view");
const authError = $("auth-error");
const memoError = $("memo-error");
const memoList = $("memo-list");

// Firebaseのエラーコードを日本語メッセージに変換
function toMessage(err) {
  const messages = {
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/invalid-credential": "メールアドレスまたはパスワードが違います。",
    "auth/email-already-in-use": "このメールアドレスは既に登録されています。",
    "auth/weak-password": "パスワードは6文字以上にしてください。",
    "auth/popup-closed-by-user": "ログインがキャンセルされました。",
    "auth/operation-not-allowed": "このログイン方法はFirebaseコンソールで有効になっていません。",
    "permission-denied": "保存する権限がありません（Firestoreのルールを確認してください）。",
  };
  return messages[err.code] ?? `エラーが発生しました（${err.code ?? err.message}）`;
}

// ---- ログイン ----
$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    if (e.submitter?.dataset.action === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authError.textContent = toMessage(err);
  }
});

$("google-login").addEventListener("click", async () => {
  authError.textContent = "";
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    authError.textContent = toMessage(err);
  }
});

$("logout").addEventListener("click", () => signOut(auth));

// ---- データ保存（ユーザーごとのメモ: users/{uid}/memos） ----
let unsubscribeMemos = null;

function memosRef(uid) {
  return collection(db, "users", uid, "memos");
}

function renderMemos(snapshot, uid) {
  memoList.replaceChildren();
  if (snapshot.empty) {
    const p = document.createElement("li");
    p.className = "empty";
    p.textContent = "まだメモはありません。";
    memoList.append(p);
    return;
  }
  snapshot.forEach((memoDoc) => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = memoDoc.data().text;
    const del = document.createElement("button");
    del.className = "secondary small";
    del.textContent = "削除";
    del.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "users", uid, "memos", memoDoc.id));
      } catch (err) {
        memoError.textContent = toMessage(err);
      }
    });
    li.append(text, del);
    memoList.append(li);
  });
}

$("memo-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  memoError.textContent = "";
  const input = $("memo-text");
  const text = input.value.trim();
  if (!text || !auth.currentUser) return;
  try {
    await addDoc(memosRef(auth.currentUser.uid), {
      text,
      createdAt: serverTimestamp(),
    });
    input.value = "";
  } catch (err) {
    memoError.textContent = toMessage(err);
  }
});

// ---- ログイン状態で表示を切り替え ----
onAuthStateChanged(auth, (user) => {
  unsubscribeMemos?.();
  unsubscribeMemos = null;

  if (user) {
    $("user-email").textContent = user.email ?? user.displayName ?? "ログイン中";
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    const q = query(memosRef(user.uid), orderBy("createdAt", "desc"));
    unsubscribeMemos = onSnapshot(
      q,
      (snapshot) => renderMemos(snapshot, user.uid),
      (err) => (memoError.textContent = toMessage(err)),
    );
  } else {
    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    memoList.replaceChildren();
  }
});
