import { useEffect, useState } from 'react';
import { subscribeJudges } from '../../services/userService';
import { subscribeCompetitions } from '../../services/competitionService';
import { createJudgeAccount } from '../../services/authService';
import { updateUser, deleteUser } from '../../services/userService';
import type { AppUser, Competition } from '../../types';
import toast from 'react-hot-toast';

const JudgeManager = () => {
  const [judges, setJudges] = useState<AppUser[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub1 = subscribeJudges(setJudges);
    const unsub2 = subscribeCompetitions(setCompetitions);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setDisplayName('');
    setSelectedComps([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleToggleComp = (compId: string) => {
    setSelectedComps((prev) =>
      prev.includes(compId) ? prev.filter((id) => id !== compId) : [...prev, compId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      try {
        await updateUser(editingId, {
          displayName: displayName.trim(),
          competitionIds: selectedComps,
        });
        toast.success('แก้ไขข้อมูลกรรมการสำเร็จ');
        resetForm();
      } catch {
        toast.error('แก้ไขข้อมูลไม่สำเร็จ');
      }
      return;
    }

    if (!username || !password || !displayName.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (password.length < 4) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      await createJudgeAccount(username, password, displayName.trim(), selectedComps);
      toast.success('สร้างบัญชีกรรมการสำเร็จ');
      resetForm();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'สร้างบัญชีไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (judge: AppUser) => {
    setEditingId(judge.id);
    setDisplayName(judge.displayName);
    setUsername(judge.username);
    setSelectedComps(judge.competitionIds || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบกรรมการ "${name}" ใช่หรือไม่?`)) return;
    try {
      await deleteUser(id);
      toast.success('ลบสำเร็จ');
    } catch {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const getCompName = (compId: string) => competitions.find((c) => c.id === compId)?.name || compId;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>จัดการกรรมการ</h1>
          <p className="text-muted text-sm mb-0">สร้างและกำหนดสิทธิ์ผู้เข้าลงคะแนนตัดสินประเภทต่างๆ</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn btn-primary btn-sm font-weight-bold"
        >
          <i className="fas fa-plus mr-1"></i> เพิ่มกรรมการ
        </button>
      </div>

      {/* Bootstrap Modal Form */}
      {showForm && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => resetForm()}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-light py-3">
                <h5 className="modal-title font-weight-bold text-dark" style={{ fontSize: '15px' }}>
                  {editingId ? (
                    <span><i className="fas fa-edit text-primary mr-1"></i> แก้ไขกรรมการ</span>
                  ) : (
                    <span><i className="fas fa-plus text-success mr-1"></i> เพิ่มกรรมการ</span>
                  )}
                </h5>
                <button type="button" onClick={resetForm} className="close" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body space-y-3">
                  {!editingId && (
                    <>
                      <div className="form-group">
                        <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">
                          ชื่อผู้ใช้ (Username) *
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="form-control"
                          placeholder="เช่น judge_star"
                        />
                      </div>
                      <div className="form-group">
                        <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">
                          รหัสผ่าน (Password) *
                        </label>
                        <input
                          type="text"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="form-control"
                          placeholder="อย่างน้อย 4 ตัวอักษร"
                        />
                      </div>
                    </>
                  )}
                  <div className="form-group">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">
                      ชื่อแสดงผล (Display Name) *
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="form-control"
                      placeholder="ชื่อยศกรรมการผู้ประกวด"
                    />
                  </div>

                  {/* Competition assignment */}
                  <div className="form-group">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-2">
                      ประเภทการแข่งขันที่รับผิดชอบ
                    </label>
                    <div className="p-2 border border-gray-200 rounded bg-light overflow-y-auto" style={{ maxHeight: '180px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                      {competitions.length === 0 ? (
                        <p className="text-xs text-muted mb-0 p-1">ยังไม่มีประเภทการประกวด</p>
                      ) : (
                        competitions.map((comp) => (
                          <div key={comp.id} className="custom-control custom-checkbox ml-1">
                            <input
                              type="checkbox"
                              id={`comp-check-${comp.id}`}
                              checked={selectedComps.includes(comp.id)}
                              onChange={() => handleToggleComp(comp.id)}
                              className="custom-control-input"
                            />
                            <label htmlFor={`comp-check-${comp.id}`} className="custom-control-label font-weight-semibold text-dark text-sm cursor-pointer select-none">
                              {comp.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button type="button" onClick={resetForm} className="btn btn-default font-weight-bold">ยกเลิก</button>
                  <button type="submit" disabled={loading} className="btn btn-primary font-weight-bold">
                    {loading ? 'กำลังบันทึก...' : editingId ? 'บันทึก' : 'สร้างบัญชี'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Judges List */}
      <div className="row">
        {judges.length === 0 ? (
          <div className="col-12">
            <div className="card p-5 text-center shadow-xs bg-white border">
              <div className="text-muted text-5xl mb-3"><i className="fas fa-gavel"></i></div>
              <h5 className="font-weight-bold text-dark mb-1">ยังไม่มีบัญชีกรรมการ</h5>
              <p className="text-muted text-xs mb-0">กดปุ่ม "เพิ่มกรรมการ" ด้านขวาเพื่อลงทะเบียนบัญชี</p>
            </div>
          </div>
        ) : (
          judges.map((judge) => (
            <div key={judge.id} className="col-lg-4 col-sm-6 mb-3">
              <div className="card card-success card-outline shadow-sm bg-white mb-0 h-100 d-flex flex-col justify-content-between group">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center">
                    <div className="img-circle bg-green-50 text-success border border-green-200 d-flex align-items-center justify-content-center font-weight-bold shadow-inner" style={{ width: '42px', height: '42px', fontSize: '15px' }}>
                      {judge.displayName.charAt(0)}
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <h5 className="font-weight-bold text-dark mb-0 text-truncate text-sm" style={{ fontSize: '14px' }}>{judge.displayName}</h5>
                      <p className="text-muted text-xs mb-0 text-truncate mt-0.5">Username: @{judge.username}</p>
                    </div>
                  </div>
                  {judge.competitionIds?.length > 0 && (
                    <div className="mt-3.5 pt-3.5 border-t border-gray-100 d-flex flex-wrap gap-1">
                      {judge.competitionIds.map((compId) => (
                        <span
                          key={compId}
                          className="badge badge-light border text-gray-600 px-2 py-0.5 font-weight-semibold"
                          style={{ fontSize: '9px' }}
                        >
                          {getCompName(compId)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-footer bg-gray-50/50 py-2.5 px-4 d-flex align-items-center gap-2 border-top">
                  <button
                    onClick={() => handleEdit(judge)}
                    className="btn btn-default btn-xs flex-1 font-weight-bold py-1 border-gray-200"
                    style={{ fontSize: '11px' }}
                  >
                    <i className="fas fa-edit text-primary mr-1"></i> แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(judge.id, judge.displayName)}
                    className="btn btn-default btn-xs flex-1 font-weight-bold py-1 border-gray-200"
                    style={{ fontSize: '11px' }}
                  >
                    <i className="fas fa-trash-alt text-danger mr-1"></i> ลบ
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JudgeManager;
