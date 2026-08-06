import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Substitui os confirm() nativos do navegador por um modal estilizado. */
export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <Modal
      title={title}
      onClose={onCancel}
      maxWidth={420}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>{description}</p>
    </Modal>
  );
}
