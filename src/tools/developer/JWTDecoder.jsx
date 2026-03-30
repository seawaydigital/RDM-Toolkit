import { useState, useMemo, useCallback } from 'react';
import InfoCard from '../../components/ui/InfoCard';
import ErrorCard from '../../components/ui/ErrorCard';
import { Copy, Check } from 'lucide-react';

function base64UrlDecode(str) {
  // Replace URL-safe chars and pad
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return atob(base64);
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function formatTimestamp(ts) {
  if (typeof ts !== 'number') return null;
  const date = new Date(ts * 1000);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString() + ' (' + date.toISOString() + ')';
}

function getExpirationStatus(payload) {
  if (!payload || typeof payload.exp !== 'number') return 'no-exp';
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now ? 'valid' : 'expired';
}

const TIMESTAMP_KEYS = ['exp', 'iat', 'nbf', 'auth_time'];

export default function JWTDecoder({ tool }) {
  const [jwtInput, setJwtInput] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const decoded = useMemo(() => {
    const token = jwtInput.trim();
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format. A JWT must have three parts separated by dots (header.payload.signature).' };
    }

    try {
      const headerStr = base64UrlDecode(parts[0]);
      const payloadStr = base64UrlDecode(parts[1]);
      const header = tryParseJSON(headerStr);
      const payload = tryParseJSON(payloadStr);

      if (!header) return { error: 'Could not parse JWT header as JSON.' };
      if (!payload) return { error: 'Could not parse JWT payload as JSON.' };

      // Convert signature to hex
      const sigBytes = base64UrlDecode(parts[2]);
      const sigHex = Array.from(sigBytes, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

      return {
        header,
        payload,
        signatureHex: sigHex,
        rawParts: parts,
        expirationStatus: getExpirationStatus(payload),
      };
    } catch (e) {
      return { error: 'Failed to decode JWT. The token may be malformed or corrupted.' };
    }
  }, [jwtInput]);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { /* ignore */ }
  }, []);

  const renderJsonSection = (title, data, colorClass, fieldKey) => {
    const jsonStr = JSON.stringify(data, null, 2);
    // Annotate timestamp fields
    const annotatedLines = jsonStr.split('\n').map((line, i) => {
      for (const key of TIMESTAMP_KEYS) {
        const regex = new RegExp(`"${key}":\\s*(\\d+)`);
        const match = line.match(regex);
        if (match) {
          const formatted = formatTimestamp(parseInt(match[1], 10));
          if (formatted) {
            return (
              <span key={i}>
                {line}
                <span className="jwt-timestamp-annotation"> // {formatted}</span>
                {'\n'}
              </span>
            );
          }
        }
      }
      return line + '\n';
    });

    return (
      <div className={`jwt-section ${colorClass}`}>
        <div className="jwt-section-header">
          <span className="jwt-section-title">{title}</span>
          <button
            className="jwt-section-copy"
            onClick={() => handleCopy(jsonStr, fieldKey)}
            title={`Copy ${title}`}
          >
            {copiedField === fieldKey ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <pre className="jwt-section-code"><code>{annotatedLines}</code></pre>
      </div>
    );
  };

  return (
    <div>
      <InfoCard description="Decode JSON Web Tokens and inspect the header, payload, and signature. Timestamp fields are automatically converted to readable dates. Expiration status is shown. This tool decodes only — it does not verify signatures. All processing happens locally in your browser." />

      <div className="jwt-panel">
        <div className="jwt-input-group">
          <label className="jwt-label">Paste JWT Token</label>
          <textarea
            className="jwt-textarea"
            value={jwtInput}
            onChange={e => setJwtInput(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            rows={4}
            spellCheck={false}
          />
        </div>

        {decoded?.error && (
          <ErrorCard title="Decode Error" message={decoded.error} />
        )}

        {decoded && !decoded.error && (
          <>
            {/* Colour-coded raw token */}
            <div className="jwt-raw">
              <span className="jwt-raw-header">{decoded.rawParts[0]}</span>
              <span className="jwt-raw-dot">.</span>
              <span className="jwt-raw-payload">{decoded.rawParts[1]}</span>
              <span className="jwt-raw-dot">.</span>
              <span className="jwt-raw-signature">{decoded.rawParts[2]}</span>
            </div>

            {/* Expiration badge */}
            <div className="jwt-expiration">
              {decoded.expirationStatus === 'valid' && (
                <span className="jwt-exp-badge jwt-exp-badge--valid">Token is valid (not expired)</span>
              )}
              {decoded.expirationStatus === 'expired' && (
                <span className="jwt-exp-badge jwt-exp-badge--expired">Token is expired</span>
              )}
              {decoded.expirationStatus === 'no-exp' && (
                <span className="jwt-exp-badge jwt-exp-badge--noexp">No expiration claim (exp)</span>
              )}
            </div>

            {renderJsonSection('Header', decoded.header, 'jwt-section--header', 'header')}
            {renderJsonSection('Payload', decoded.payload, 'jwt-section--payload', 'payload')}

            <div className="jwt-section jwt-section--signature">
              <div className="jwt-section-header">
                <span className="jwt-section-title">Signature</span>
                <button
                  className="jwt-section-copy"
                  onClick={() => handleCopy(decoded.signatureHex, 'signature')}
                  title="Copy Signature"
                >
                  {copiedField === 'signature' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="jwt-section-code"><code className="jwt-sig-hex">{decoded.signatureHex}</code></pre>
              <p className="jwt-sig-note">
                Signature is displayed as hex. This tool does not verify signatures — it decodes only.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
