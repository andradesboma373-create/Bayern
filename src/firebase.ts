// Client proxy to backend DB endpoints
export const db: any = "localdb";

export const auth: any = {
  currentUser: {
    uid: "local_admin",
    name: "Local Admin",
    email: "admin@local"
  }
};

export const logout = async (): Promise<void> => {
  try {
    localStorage.removeItem("customUser");
  } catch {}
  window.location.reload();
};

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void): (() => void) => {
  try {
    const r = localStorage.getItem("customUser");
    if (r) {
      try {
        callback(JSON.parse(r));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
  } catch {
    callback(null);
  }
  return () => {};
};

export const signInWithEmailAndPassword = async (_auth: any, email: string, _pass: string) => ({
  user: { uid: email, name: email }
});

export const createUserWithEmailAndPassword = async (_auth: any, email: string, _pass: string) => ({
  user: { uid: email, name: email }
});

export function collection(_db: any, path: string): { path: string } {
  return { path };
}

export function doc(first: any, second?: string, third?: string): { path: string; id: string } {
  if (first && typeof first === "object" && first.path && !second) {
    const p = first.path;
    const autoId = "local_" + Math.random().toString(36).substring(2, 15);
    return { path: `${p}/${autoId}`, id: autoId };
  }
  if (typeof second === "string") {
    const autoId = third || "local_" + Math.random().toString(36).substring(2, 15);
    return { path: `${second}/${autoId}`, id: autoId };
  }
  return { path: String(first), id: "local_doc" };
}

export function query(colRef: { path: string }, ...filters: any[]): { path: string; filters: any[] } {
  return { path: colRef.path, filters };
}

export function where(field: string, op: string, value: any): { field: string; op: string; value: any } {
  return { field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): { field: string; op: string; value: string } {
  return { field, op: 'orderBy', value: direction };
}

export function limit(count: number): { field: string; op: string; value: number } {
  return { field: 'limit', op: 'limit', value: count };
}

export const increment = (val: number) => ({ __op: "increment", value: val });

export async function getDocs(q: any): Promise<{ docs: any[]; empty: boolean; size: number; forEach: (fn: (doc: any) => void) => void }> {
  try {
    const res = await fetch("/api/db/getDocs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q)
    });
    if (!res.ok) {
      console.warn("getDocs failed with status:", res.status);
      return { docs: [], empty: true, size: 0, forEach: () => {} };
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      console.warn("getDocs received non-json response:", ct);
      return { docs: [], empty: true, size: 0, forEach: () => {} };
    }
    const json = await res.json();
    if (!Array.isArray(json)) {
      return { docs: [], empty: true, size: 0, forEach: () => {} };
    }
    const docs = json.map(item => ({
      id: item.id,
      ref: doc(q.path || "items", item.id),
      data: () => item.data,
      exists: () => true
    }));
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: fn => docs.forEach(fn)
    };
  } catch (err) {
    console.warn("getDocs error:", err);
    return { docs: [], empty: true, size: 0, forEach: () => {} };
  }
}

export async function getDoc(docRef: any): Promise<{ id: string; data: () => any; exists: () => boolean }> {
  try {
    const res = await fetch("/api/db/getDoc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docRef)
    });
    const id = docRef.path ? docRef.path.split("/").pop() : "unknown";
    if (!res.ok) {
      console.warn("getDoc failed with status:", res.status);
      return { exists: () => false, data: () => null, id };
    }
    if (!(res.headers.get("content-type") || "").includes("application/json")) {
      return { exists: () => false, data: () => null, id };
    }
    const json = await res.json();
    return json
      ? { id: json.id, data: () => json.data, exists: () => true }
      : { exists: () => false, data: () => null, id };
  } catch (err) {
    console.warn("getDoc error:", err);
    const id = docRef.path ? docRef.path.split("/").pop() : "unknown";
    return { exists: () => false, data: () => null, id };
  }
}

export const getDocFromServer = getDoc;

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  try {
    await fetch("/api/db/setDoc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docRef, data, options })
    });
  } catch (err) {
    console.warn("setDoc error:", err);
  }
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  try {
    await fetch("/api/db/updateDoc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docRef, data })
    });
  } catch (err) {
    console.warn("updateDoc error:", err);
  }
}

export async function addDoc(colRef: any, data: any): Promise<{ id: string }> {
  try {
    const res = await fetch("/api/db/addDoc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionRef: colRef, data })
    });
    if (!res.ok) throw new Error("addDoc failed");
    return await res.json();
  } catch (err) {
    console.warn("addDoc error:", err);
    return { id: "local_" + Math.random().toString(36).substring(2, 15) };
  }
}

export async function deleteDoc(docRef: any): Promise<void> {
  try {
    await fetch("/api/db/deleteDoc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docRef })
    });
  } catch (err) {
    console.warn("deleteDoc error:", err);
  }
}

export function onSnapshot(ref: any, callback: (snap: any) => void): (() => void) {
  if (ref.filters) {
    getDocs(ref).then(callback);
    const interval = setInterval(() => getDocs(ref).then(callback), 5000);
    return () => clearInterval(interval);
  } else {
    getDoc(ref).then(callback);
    const interval = setInterval(() => getDoc(ref).then(callback), 5000);
    return () => clearInterval(interval);
  }
}

export function writeBatch(_db?: any) {
  const operations: any[] = [];
  return {
    set: (docRef: any, data: any, options?: any) => {
      operations.push({ type: "set", docRef, data, options });
    },
    update: (docRef: any, data: any) => {
      operations.push({ type: "update", docRef, data });
    },
    delete: (docRef: any) => {
      operations.push({ type: "delete", docRef });
    },
    commit: async () => {
      if (operations.length === 0) return;
      try {
        const res = await fetch("/api/db/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations })
        });
        if (!res.ok) throw new Error(`Batch request failed with status ${res.status}`);
      } catch {
        await Promise.allSettled(
          operations.map(op =>
            op.type === "set"
              ? setDoc(op.docRef, op.data, op.options)
              : op.type === "update"
              ? updateDoc(op.docRef, op.data)
              : op.type === "delete"
              ? deleteDoc(op.docRef)
              : Promise.resolve()
          )
        );
      }
    }
  };
}
