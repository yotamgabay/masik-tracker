import struct, hashlib, sys
d = open(sys.argv[1], 'rb').read()
eocd = d.rfind(b'PK\x05\x06')
cd_off = struct.unpack('<I', d[eocd+16:eocd+20])[0]
assert d[cd_off-16:cd_off] == b'APK Sig Block 42'
size = struct.unpack('<Q', d[cd_off-24:cd_off-16])[0]
blk = d[cd_off - size - 8 + 8: cd_off - 24]
i = 0
def lp(b, o):  # length-prefixed
    n = struct.unpack('<I', b[o:o+4])[0]; return b[o+4:o+4+n], o+4+n
while i < len(blk):
    ln = struct.unpack('<Q', blk[i:i+8])[0]; bid = struct.unpack('<I', blk[i+8:i+12])[0]; val = blk[i+12:i+8+ln]
    if bid in (0x7109871a, 0xf05368c0):
        signers, _ = lp(val, 0); signer, _ = lp(signers, 0); sdata, _ = lp(signer, 0)
        digests, o = lp(sdata, 0); certs, o = lp(sdata, o); cert, _ = lp(certs, 0)
        print(hex(bid), 'SHA256:', ':'.join('%02X' % c for c in hashlib.sha256(cert).digest()))
    i += 8 + ln
