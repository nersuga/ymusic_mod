"use strict";
// Verifies release signatures made with `ssh-keygen -Y sign -n ymusic_mod` (the SSHSIG format of OpenSSH), using
// Node's built-in Ed25519. The public key is pinned below, so a stolen GitHub account alone cannot ship an update:
// the .sha256 next to a file only proves integrity, the signature proves it came from the release key.
const crypto = require("crypto");

const NAMESPACE = "ymusic_mod";
// the release key (private part stays with the maintainer; see build.ps1)
const RELEASE_KEY = "AAAAC3NzaC1lZDI1NTE5AAAAILRWdK06zJhw//ZN7IloxlqWe0ZXV57q4ZWJKkR+qLmx";

// SSH wire format: uint32 length + bytes
const reader = (buf) => {
  let pos = 0;
  return {
    bytes(n) { if (pos + n > buf.length) throw new Error("truncated signature"); const b = buf.subarray(pos, pos + n); pos += n; return b; },
    u32() { const v = this.bytes(4).readUInt32BE(0); return v; },
    string() { return this.bytes(this.u32()); },
    done() { return pos === buf.length; },
  };
};
const sshString = (b) => { const len = Buffer.alloc(4); len.writeUInt32BE(b.length); return Buffer.concat([len, b]); };

const ed25519Key = (blob) => {
  const r = reader(blob);
  if (r.string().toString() !== "ssh-ed25519") throw new Error("not an Ed25519 key");
  const raw = r.string();
  if (raw.length !== 32) throw new Error("bad Ed25519 key");
  return crypto.createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") }, format: "jwk" });
};

// true when `armored` is a valid signature of `data` by the pinned release key
const verify = (data, armored, pinnedKey = RELEASE_KEY) => {
  const m = /-----BEGIN SSH SIGNATURE-----([\s\S]+?)-----END SSH SIGNATURE-----/.exec(String(armored || ""));
  if (!m) throw new Error("not an SSH signature");
  const r = reader(Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
  if (r.bytes(6).toString() !== "SSHSIG") throw new Error("not an SSH signature");
  if (r.u32() !== 1) throw new Error("unsupported signature version");
  const publicKey = r.string();
  const namespace = r.string().toString();
  r.string(); // reserved
  const hashAlg = r.string().toString();
  const sigBlob = r.string();
  if (!r.done()) throw new Error("trailing data in signature");
  if (!publicKey.equals(Buffer.from(pinnedKey, "base64"))) throw new Error("signed with an unknown key");
  if (namespace !== NAMESPACE) throw new Error("signature for another purpose");
  if (hashAlg !== "sha512" && hashAlg !== "sha256") throw new Error("unsupported hash " + hashAlg);
  const sr = reader(sigBlob);
  if (sr.string().toString() !== "ssh-ed25519") throw new Error("not an Ed25519 signature");
  const signature = sr.string();
  const signed = Buffer.concat([Buffer.from("SSHSIG"), sshString(Buffer.from(NAMESPACE)), sshString(Buffer.alloc(0)),
    sshString(Buffer.from(hashAlg)), sshString(crypto.createHash(hashAlg).update(data).digest())]);
  return crypto.verify(null, signed, ed25519Key(publicKey), signature);
};

module.exports = { verify, RELEASE_KEY, NAMESPACE };
