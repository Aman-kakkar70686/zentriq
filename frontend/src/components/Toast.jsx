import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toastMsg } = useApp();
  return (
    <div role="status" className={`fixed left-1/2 bottom-6 -translate-x-1/2 z-[70] bg-ink text-white px-4 py-2 rounded-xl text-sm font-medium transition duration-200 pointer-events-none ${toastMsg ? 'opacity-100' : 'opacity-0 translate-y-3'}`}>{toastMsg}</div>
  );
}
