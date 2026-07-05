import { useEffect, useState } from 'react';
import { subscribeCompetitions } from '../../services/competitionService';
import { subscribeContestantsByCompetition, addContestant, updateContestant, deleteContestant } from '../../services/contestantService';
import type { Competition, Contestant } from '../../types';
import toast from 'react-hot-toast';

// Helper to compress image to base64
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress as JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const ContestantManager = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classroom, setClassroom] = useState('');
  const [number, setNumber] = useState(1);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = subscribeCompetitions(setCompetitions);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedCompId) { setContestants([]); return; }
    const unsub = subscribeContestantsByCompetition(selectedCompId, setContestants);
    return () => unsub();
  }, [selectedCompId]);

  useEffect(() => {
    if (competitions.length > 0 && !selectedCompId) {
      setSelectedCompId(competitions[0].id);
    }
  }, [competitions, selectedCompId]);

  const resetForm = () => {
    setName('');
    setNickname('');
    setClassroom('');
    setNumber(contestants.length + 1);
    setImageUrl('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (c: Contestant) => {
    setEditingId(c.id);
    setName(c.name);
    setNickname(c.nickname);
    setClassroom(c.classroom || '');
    setNumber(c.number);
    setImageUrl(c.imageUrl || '');
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์มีขนาดใหญ่เกินไป (กรุณาเลือกไฟล์ที่ต่ำกว่า 5MB)');
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      setImageUrl(compressed);
      toast.success('อัปโหลดและบีบอัดรูปภาพสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('กรุณากรอกชื่อ'); return; }

    try {
      if (editingId) {
        await updateContestant(editingId, { 
          name: name.trim(), 
          nickname: nickname.trim(), 
          classroom: classroom.trim(),
          number,
          imageUrl: imageUrl.trim()
        });
        toast.success('แก้ไขข้อมูลสำเร็จ');
      } else {
        await addContestant({
          name: name.trim(),
          nickname: nickname.trim(),
          classroom: classroom.trim(),
          number,
          imageUrl: imageUrl.trim(),
          competitionId: selectedCompId,
          eliminatedAtRound: null,
          manuallySelected: false,
        });
        toast.success('เพิ่มผู้เข้าประกวดสำเร็จ');
      }
      resetForm();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบ "${name}" ใช่หรือไม่?`)) return;
    try {
      await deleteContestant(id);
      toast.success('ลบสำเร็จ');
    } catch {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>ผู้เข้าประกวด</h1>
          <p className="text-muted text-sm mb-0">จัดการรายชื่อ ข้อมูลเบื้องต้น และรูปถ่ายประจำตัวผู้เข้าประกวดในแต่ละประเภท</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          disabled={!selectedCompId}
          className="btn btn-primary btn-sm font-weight-bold"
        >
          <i className="fas fa-plus mr-1"></i> เพิ่มผู้เข้าประกวด
        </button>
      </div>

      {/* Tab Selector Buttons */}
      <div className="btn-group flex-wrap mb-3 shadow-xs" role="group">
        {competitions.map((comp) => (
          <button
            key={comp.id}
            onClick={() => setSelectedCompId(comp.id)}
            className={`btn btn-sm ${
              selectedCompId === comp.id ? 'btn-primary font-weight-bold' : 'btn-default bg-white text-secondary'
            } border-gray-200 px-4 py-2`}
          >
            {comp.name}
          </button>
        ))}
      </div>

      {/* Bootstrap Modal Form */}
      {showForm && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => resetForm()}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-light py-3">
                <h5 className="modal-title font-weight-bold text-dark" style={{ fontSize: '15px' }}>
                  {editingId ? (
                    <span><i className="fas fa-edit text-primary mr-1"></i> แก้ไขข้อมูลผู้เข้าประกวด</span>
                  ) : (
                    <span><i className="fas fa-plus text-success mr-1"></i> เพิ่มผู้เข้าประกวด</span>
                  )}
                </h5>
                <button type="button" onClick={resetForm} className="close" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body space-y-4">
                  {/* Photo Preview & Upload fields */}
                  <div className="form-group mb-4">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-2">รูปภาพผู้เข้าประกวด</label>
                    <div className="d-flex flex-column align-items-center p-3 border border-gray-300 rounded bg-light" style={{ gap: '10px' }}>
                      {imageUrl ? (
                        <div className="position-relative" style={{ width: '100px', height: '100px' }}>
                          <img src={imageUrl} alt="Preview" className="img-circle border shadow-sm w-100 h-100" style={{ objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="btn btn-danger btn-xs position-absolute font-weight-bold py-0 px-1 shadow-xs"
                            style={{ top: '0px', right: '0px', borderRadius: '50%' }}
                            title="ลบรูปภาพ"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="img-circle bg-secondary d-flex align-items-center justify-content-center text-white text-3xl shadow-inner border border-gray-300" style={{ width: '100px', height: '100px' }}>
                          <i className="fas fa-user-tie"></i>
                        </div>
                      )}
                      <div className="w-100 mt-2">
                        <label className="btn btn-outline-primary btn-block btn-sm mb-0 font-weight-bold cursor-pointer">
                          {uploading ? 'กำลังบันทึกและย่อรูป...' : <span><i className="fas fa-upload mr-1"></i> เลือกรูปภาพ (ย่อขนาดอัตโนมัติ)</span>}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                        </label>
                      </div>
                      <div className="w-100 text-center text-muted font-weight-bold text-xxs my-1" style={{ fontSize: '10px' }}>
                        — หรือวาง URL ลิงก์รูปภาพภายนอก —
                      </div>
                      <input
                        type="url"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="form-control form-control-sm text-xs"
                      />
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="form-group">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">หมายเลขผู้ประกวด (เบอร์) *</label>
                    <input type="number" value={number} onChange={e => setNumber(parseInt(e.target.value) || 0)} min={1} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">ชื่อ-นามสกุลจริง *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-control" placeholder="ชื่อ และนามสกุลจริง" />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">ชื่อเล่น</label>
                    <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="form-control" placeholder="ชื่อเล่น" />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">ห้องเรียน / ชั้นปี</label>
                    <input type="text" value={classroom} onChange={e => setClassroom(e.target.value)} className="form-control" placeholder="เช่น ม.6/4 หรือ ปี 1 ห้อง A" />
                  </div>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button type="button" onClick={resetForm} className="btn btn-default font-weight-bold">ยกเลิก</button>
                  <button type="submit" disabled={uploading} className="btn btn-primary font-weight-bold">
                    {editingId ? 'บันทึก' : 'เพิ่มเข้าระบบ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Grid Contestant cards */}
      {!selectedCompId ? (
        <div className="card p-5 text-center shadow-xs bg-white border">
          <div className="text-muted text-5xl mb-3"><i className="fas fa-users"></i></div>
          <h5 className="font-weight-bold text-dark mb-1">กรุณาเลือกประเภทการประกวด</h5>
          <p className="text-muted text-xs mb-0">คลิกเลือกปุ่มประเภทด้านบนเพื่อแสดงรายชื่อ</p>
        </div>
      ) : contestants.length === 0 ? (
        <div className="card p-5 text-center shadow-xs bg-white border">
          <div className="text-muted text-5xl mb-3"><i className="fas fa-user-friends"></i></div>
          <h5 className="font-weight-bold text-dark mb-1">ยังไม่มีผู้ประกวดของประเภทนี้</h5>
          <p className="text-muted text-xs mb-0">คลิกปุ่ม "เพิ่มผู้เข้าประกวด" เพื่อเริ่มต้นข้อมูลรายชื่อ</p>
        </div>
      ) : (
        <div className="row">
          {contestants.map((c) => (
            <div key={c.id} className="col-lg-4 col-sm-6 mb-3">
              <div className="card card-primary card-outline shadow-sm bg-white mb-0 h-100 d-flex flex-column justify-content-between group">
                <div className="card-body p-4 d-flex align-items-center">
                  {c.imageUrl ? (
                    <div className="mr-3 border rounded shadow-sm flex-shrink-0" style={{ width: '56px', height: '56px', overflow: 'hidden' }}>
                      <img src={c.imageUrl} alt={c.name} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div className="img-circle bg-blue-50 text-primary border border-blue-100 d-flex align-items-center justify-content-center font-weight-bold mr-3 shadow-inner flex-shrink-0" style={{ width: '56px', height: '56px', fontSize: '18px' }}>
                      {c.number}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="d-flex align-items-center gap-1.5 flex-wrap">
                      <span className="badge badge-primary px-2 py-0.5" style={{ fontSize: '10px' }}>เบอร์ {c.number}</span>
                      {c.eliminatedAtRound !== null && c.eliminatedAtRound !== undefined && (
                        <span className="badge badge-danger px-2 py-0.5" style={{ fontSize: '10px' }}>ตกรอบ</span>
                      )}
                    </div>
                    <h5 className="font-weight-bold text-dark mt-1.5 mb-0 text-truncate text-sm" style={{ fontSize: '14px' }}>{c.name}</h5>
                    {c.nickname && <p className="text-muted text-xs mb-0 leading-none mt-1">ชื่อเล่น: "{c.nickname}"</p>}
                    {c.classroom && <p className="text-muted text-xs mb-0 leading-none mt-1">ห้อง: {c.classroom}</p>}
                  </div>
                </div>
                <div className="card-footer bg-gray-50/50 py-2.5 px-4 d-flex align-items-center gap-2 border-top">
                  <button
                    onClick={() => handleEdit(c)}
                    className="btn btn-default btn-xs flex-1 font-weight-bold py-1 border-gray-200"
                    style={{ fontSize: '11px' }}
                  >
                    <i className="fas fa-edit text-primary mr-1"></i> แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="btn btn-default btn-xs flex-1 font-weight-bold py-1 border-gray-200"
                    style={{ fontSize: '11px' }}
                  >
                    <i className="fas fa-trash-alt text-danger mr-1"></i> ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContestantManager;
