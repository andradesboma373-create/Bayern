// Local Database Mock

export const db = "localdb";

// Auth Mock (since Firebase Auth is also removed)
export const auth = {
  currentUser: { uid: 'local_admin', name: 'Local Admin', email: 'admin@local' }
};

export const logout = async () => {
  try {
    localStorage.removeItem('customUser');
  } catch (e) {}
  window.location.reload();
};

export const onAuthStateChanged = (authObj: any, callback: any) => {
  try {
    const userStr = localStorage.getItem('customUser');
    if (userStr) {
      try {
        callback(JSON.parse(userStr));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
  } catch (e) {
    callback(null);
  }
  return () => {};
};

export const signInWithEmailAndPassword = async (authObj: any, u: string, p: string) => {
  return { user: { uid: u, name: u } };
};

export const createUserWithEmailAndPassword = async (authObj: any, u: string, p: string) => {
  return { user: { uid: u, name: u } };
};

export function collection(db: any, path: string) { return { path }; }
export function doc(db: any, path?: any, id?: string) {
  if (db && typeof db === 'object' && db.path && !path) {
    const colPath = db.path;
    const generatedId = 'local_' + Math.random().toString(36).substring(2, 15);
    return { path: `${colPath}/${generatedId}`, id: generatedId };
  }
  if (typeof path === 'string') {
    const finalId = id || 'local_' + Math.random().toString(36).substring(2, 15);
    return { path: `${path}/${finalId}`, id: finalId };
  }
  return { path: String(db), id: 'local_doc' };
}
export function query(col: any, ...filters: any[]) { return { path: col.path, filters }; }
export function where(field: string, op: string, value: any) { return { field, op, value }; }
export function orderBy(field: string, direction: string = 'asc') { return { field, op: 'orderBy', value: direction }; }
export const increment = (n: number) => ({ __op: 'increment', value: n });

export async function getDocs(queryRef: any) {
  try {
    const res = await fetch('/api/db/getDocs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryRef)
    });
    
    if (!res.ok) {
      console.warn("getDocs failed with status:", res.status);
      return { docs: [], empty: true, size: 0, forEach: () => {} };
    }
    
    const data = await res.json();
    const docs = data.map((d: any) => ({
      id: d.id,
      data: () => d.data,
      exists: () => true
    }));
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (cb: any) => docs.forEach(cb)
    };
  } catch (err) {
    console.error("getDocs error:", err);
    return { docs: [], empty: true, size: 0, forEach: () => {} };
  }
}

export async function getDoc(docRef: any) {
  try {
    const res = await fetch('/api/db/getDoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docRef)
    });
    
    if (!res.ok) {
      console.warn("getDoc failed with status:", res.status);
      return { exists: () => false, data: () => null, id: docRef.path.split('/').pop() };
    }
    
    const data = await res.json();
    if (!data) {
      return { exists: () => false, data: () => null, id: docRef.path.split('/').pop() };
    }
    return {
      id: data.id,
      data: () => data.data,
      exists: () => true
    };
  } catch (err) {
    console.error("getDoc error:", err);
    return { exists: () => false, data: () => null, id: docRef.path.split('/').pop() };
  }
}

export async function setDoc(docRef: any, data: any, options?: any) {
  try {
    await fetch('/api/db/setDoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docRef, data, options })
    });
  } catch (err) {
    console.warn("setDoc error:", err);
  }
}

export async function updateDoc(docRef: any, data: any) {
  try {
    await fetch('/api/db/updateDoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docRef, data })
    });
  } catch (err) {
    console.warn("updateDoc error:", err);
  }
}

export async function addDoc(collectionRef: any, data: any) {
  try {
    const res = await fetch('/api/db/addDoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionRef, data })
    });
    if (!res.ok) throw new Error("addDoc failed");
    return await res.json();
  } catch (err) {
    console.warn("addDoc error:", err);
    return { id: 'local_' + Math.random().toString(36).substring(2, 15) };
  }
}

export async function deleteDoc(docRef: any) {
  try {
    await fetch('/api/db/deleteDoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docRef })
    });
  } catch (err) {
    console.warn("deleteDoc error:", err);
  }
}

export function onSnapshot(ref: any, callback: any) {
  // Mock onSnapshot with a single fetch and polling
  if (ref.filters) {
    // it's a query
    getDocs(ref).then(callback);
    const interval = setInterval(() => getDocs(ref).then(callback), 5000);
    return () => clearInterval(interval);
  } else {
    // it's a doc
    getDoc(ref).then(callback);
    const interval = setInterval(() => getDoc(ref).then(callback), 5000);
    return () => clearInterval(interval);
  }
}

export function writeBatch(db: any) {
  const operations: any[] = [];
  return {
    set: (ref: any, data: any, options?: any) => { operations.push({ type: 'set', ref, data, options }); },
    update: (ref: any, data: any) => { operations.push({ type: 'update', ref, data }); },
    delete: (ref: any) => { operations.push({ type: 'delete', ref }); },
    commit: async () => {
      if (operations.length === 0) return;
      await Promise.allSettled(operations.map(op => {
        if (op.type === 'set') return setDoc(op.ref, op.data, op.options);
        if (op.type === 'update') return updateDoc(op.ref, op.data);
        if (op.type === 'delete') return deleteDoc(op.ref);
        return Promise.resolve();
      }));
    }
  };
}

export const getDocFromServer = getDoc;
