import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from './LocalizationProvider';

const FamilyDialog = ({ device, onClose }) => {
  const t = useTranslation();
  const frame = useRef(null);
  const ready = useRef(false);
  const session = useRef(null);
  const timer = useRef(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const receive = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) {
        return;
      }
      if (event.data?.type === 'family-ready') {
        ready.current = true;
      } else if (event.data?.type === 'family-session') {
        const id = event.data.id;
        if (id === null || (typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id))) {
          session.current = id;
        }
      } else if (event.data?.type === 'family-closed') {
        session.current = null;
        clearTimeout(timer.current);
        onClose();
      } else if (event.data?.type === 'family-close-failed') {
        clearTimeout(timer.current);
        setClosing(false);
        setError(true);
      }
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      clearTimeout(timer.current);
    };
  }, [onClose]);

  useEffect(
    () => () => {
      if (session.current) {
        fetch(`/api/family/${session.current}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          keepalive: true,
        }).catch(() => {});
      }
    },
    [],
  );

  const close = () => {
    if (closing) {
      return;
    }
    if (!ready.current) {
      onClose();
      return;
    }
    setClosing(true);
    setError(false);
    frame.current?.contentWindow.postMessage({ type: 'family-close' }, window.location.origin);
    timer.current = setTimeout(() => {
      setClosing(false);
      setError(true);
    }, 10000);
  };

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={close} aria-labelledby="family-dialog-title">
      <DialogTitle id="family-dialog-title">
        {t('familyTitle')} · {device.name}
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {error && <Alert severity="warning">{t('familyCloseError')}</Alert>}
        <iframe
          ref={frame}
          title={t('familyTitle')}
          src={`/api/family/ui?deviceId=${device.id}&embedded=1`}
          allow="autoplay"
          style={{ border: 0, width: '100%', height: '65vh', display: 'block' }}
        />
      </DialogContent>
      <DialogActions>
        {error && <Button onClick={onClose}>{t('familyCloseAnyway')}</Button>}
        <Button onClick={close} disabled={closing}>
          {t(closing ? 'familyClosing' : 'familyStopClose')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FamilyDialog;
