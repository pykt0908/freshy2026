import { useEffect, useState, useRef } from 'react';
import { subscribeCompetitions, addCompetition, updateCompetition, deleteCompetition } from '../../services/competitionService';
import type { Competition, Criterion, Round } from '../../types';
import toast from 'react-hot-toast';

const SummernoteEditor = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const summernoteLoaded = useRef(false);

  useEffect(() => {
    if (editorRef.current && !summernoteLoaded.current) {
      // @ts-ignore
      const $editor = window.$(editorRef.current);
      $editor.summernote({
        height: 150,
        callbacks: {
          onChange: function(contents: string) {
            onChange(contents);
          }
        }
      });
      if (value) {
        $editor.summernote('code', value);
      }
      summernoteLoaded.current = true;
      
      return () => {
        $editor.summernote('destroy');
        summernoteLoaded.current = false;
      };
    }
  }, []);

  return <textarea ref={editorRef} defaultValue={value} />;
};

const CompetitionManager = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rounds, setRounds] = useState<Round[]>([
    {
      name: 'รอบที่ 1',
      topN: 10,
      status: 'pending',
      criteria: [{ id: crypto.randomUUID(), name: '', maxScore: 10 }]
    }
  ]);

  useEffect(() => {
    const unsub = subscribeCompetitions(setCompetitions);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setRounds([
      {
        name: 'รอบที่ 1',
        topN: 10,
        status: 'pending',
        criteria: [{ id: crypto.randomUUID(), name: '', maxScore: 10 }]
      }
    ]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (comp: Competition) => {
    setEditingId(comp.id);
    setName(comp.name);
    setDescription(comp.description || '');
    
    const mappedRounds = comp.rounds?.map((r) => ({
      ...r,
      criteria: r.criteria?.length 
        ? r.criteria 
        : (comp.criteria?.length ? comp.criteria : [{ id: crypto.randomUUID(), name: '', maxScore: 10 }])
    })) || [
      {
        name: 'รอบที่ 1',
        topN: 10,
        status: 'pending',
        criteria: [{ id: crypto.randomUUID(), name: '', maxScore: 10 }]
      }
    ];

    setRounds(mappedRounds);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('กรุณากรอกชื่อประเภทการแข่งขัน');
      return;
    }

    const validRounds = rounds
      .map((r) => {
        const validRoundCriteria = (r.criteria || []).filter((c) => c.name.trim());
        return {
          ...r,
          name: r.name.trim(),
          criteria: validRoundCriteria,
        };
      })
      .filter((r) => r.name.trim());

    if (validRounds.length === 0) {
      toast.error('กรุณาเพิ่มรอบอย่างน้อย 1 รอบ');
      return;
    }

    // Verify each round has at least one scoring criterion
    for (const r of validRounds) {
      if (r.criteria.length === 0) {
        toast.error(`กรุณาเพิ่มเกณฑ์อย่างน้อย 1 ข้อในรอบ "${r.name}"`);
        return;
      }
    }

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        criteria: [], // No longer using global criteria
        rounds: validRounds,
        currentRound: 0,
        status: 'draft' as const,
      };

      if (editingId) {
        await updateCompetition(editingId, data);
        toast.success('แก้ไขข้อมูลสำเร็จ');
      } else {
        await addCompetition(data);
        toast.success('เพิ่มประเภทการแข่งขันสำเร็จ');
      }
      resetForm();
    } catch {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบประเภทการแข่งขัน "${name}" ใช่หรือไม่?`)) return;
    try {
      await deleteCompetition(id);
      toast.success('ลบประเภทสำเร็จ');
    } catch {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const addRound = () => setRounds([...rounds, { name: '', topN: 5, status: 'pending' }]);
  const removeRound = (idx: number) => setRounds(rounds.filter((_, i) => i !== idx));
  const updateRound = (idx: number, field: keyof Round, value: string | number) => {
    const updated = [...rounds];
    (updated[idx] as Record<string, unknown>)[field] = value;
    setRounds(updated);
  };
  const addRoundCriterion = (roundIdx: number) => {
    const updated = [...rounds];
    const r = updated[roundIdx];
    const currentCriteria = r.criteria || [];
    updated[roundIdx] = {
      ...r,
      criteria: [...currentCriteria, { id: crypto.randomUUID(), name: '', maxScore: 10 }]
    };
    setRounds(updated);
  };

  const removeRoundCriterion = (roundIdx: number, critIdx: number) => {
    const updated = [...rounds];
    const r = updated[roundIdx];
    const currentCriteria = r.criteria || [];
    updated[roundIdx] = {
      ...r,
      criteria: currentCriteria.filter((_, i) => i !== critIdx)
    };
    setRounds(updated);
  };

  const updateRoundCriterion = (roundIdx: number, critIdx: number, field: keyof Criterion, value: string | number) => {
    const updated = [...rounds];
    const r = updated[roundIdx];
    const currentCriteria = [...(r.criteria || [])];
    (currentCriteria[critIdx] as Record<string, unknown>)[field] = value;
    updated[roundIdx] = {
      ...r,
      criteria: currentCriteria
    };
    setRounds(updated);
  };


  return (
    <div className="space-y-4">
      {/* Content Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>ประเภทการแข่งขัน</h1>
          <p className="text-muted text-sm mb-0">จัดการประเภท เกณฑ์คะแนน และรอบการประกวดต่างๆ</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn btn-primary btn-sm font-weight-bold"
        >
          <i className="fas fa-plus mr-1"></i> เพิ่มประเภทประกวด
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
            className="modal-dialog modal-lg modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: '50px' }}
          >
            <form onSubmit={handleSubmit} className="modal-content shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title font-weight-bold text-dark" style={{ fontSize: '16px' }}>
                  {editingId ? (
                    <span><i className="fas fa-edit text-primary mr-1"></i> แก้ไขประเภทประกวด</span>
                  ) : (
                    <span><i className="fas fa-plus text-success mr-1"></i> เพิ่มประเภทประกวด</span>
                  )}
                </h5>
                <button type="button" onClick={resetForm} className="close" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body space-y-4">
                  {/* Name & Description */}
                  <div className="form-group">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">
                      ชื่อประเภทการแข่งขัน *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-control"
                      placeholder="เช่น ดาว, เดือน, LG"
                    />
                  </div>
                  <div className="form-group mb-4">
                    <label className="text-xs font-weight-bold text-muted text-uppercase mb-1">คำอธิบาย</label>
                    <SummernoteEditor
                      value={description}
                      onChange={setDescription}
                    />
                  </div>

                  {/* Rounds */}
                  <div className="card card-outline card-secondary p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <label className="text-xs font-weight-bold text-muted text-uppercase mb-0">รอบการแข่งขัน</label>
                      <button
                        type="button"
                        onClick={addRound}
                        className="btn btn-link btn-xs p-0 font-weight-bold text-primary text-decoration-none"
                      >
                        <i className="fas fa-plus mr-1"></i> เพิ่มรอบประกวด
                      </button>
                    </div>
                    <div className="space-y-3">
                      {rounds.map((r, idx) => (
                        <div key={idx} className="card p-3 mb-3 bg-white border">
                          <div className="row align-items-center mb-2">
                            <div className="col-1 font-weight-bold text-muted text-sm">{idx + 1}.</div>
                            <div className="col-6">
                              <input
                                type="text"
                                value={r.name}
                                onChange={(e) => updateRound(idx, 'name', e.target.value)}
                                className="form-control form-control-sm font-weight-bold"
                                placeholder="ชื่อรอบ เช่น รอบคัดเลือก"
                              />
                            </div>
                            <div className="col-4 d-flex align-items-center gap-1.5 justify-content-end">
                              <span className="text-xs text-muted">คัดผ่านเหลือ Top</span>
                              <input
                                type="number"
                                value={r.topN}
                                onChange={(e) => updateRound(idx, 'topN', parseInt(e.target.value) || 0)}
                                className="form-control form-control-sm text-center"
                                min={1}
                                style={{ width: '60px' }}
                              />
                              <span className="text-xs text-muted">คน</span>
                            </div>
                            <div className="col-1 text-right">
                              {rounds.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRound(idx)}
                                  className="btn btn-outline-danger btn-xs border-0"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Round Specific Criteria */}
                          <div className="mt-2 pl-3 border-left" style={{ borderLeftWidth: '3px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-xs font-weight-bold text-secondary">
                                <i className="fas fa-bullseye mr-1 text-info"></i> เกณฑ์การให้คะแนนประจำรอบนี้ (หากเว้นไว้จะใช้เกณฑ์รวม)
                              </span>
                              <button
                                type="button"
                                onClick={() => addRoundCriterion(idx)}
                                className="btn btn-link btn-xs p-0 font-weight-bold text-info text-decoration-none"
                              >
                                <i className="fas fa-plus mr-1"></i> เพิ่มเกณฑ์เฉพาะรอบ
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(r.criteria || []).map((c, cIdx) => (
                                <div key={c.id} className="d-flex align-items-center gap-2 mb-2">
                                  <input
                                    type="text"
                                    value={c.name}
                                    onChange={(e) => updateRoundCriterion(idx, cIdx, 'name', e.target.value)}
                                    className="form-control form-control-sm"
                                    placeholder="ชื่อเกณฑ์ เช่น บุคลิกภาพ"
                                  />
                                  <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                                    <span className="text-xs text-muted">คะแนนเต็ม:</span>
                                    <input
                                      type="number"
                                      value={c.maxScore}
                                      onChange={(e) => updateRoundCriterion(idx, cIdx, 'maxScore', parseInt(e.target.value) || 0)}
                                      className="form-control form-control-sm text-center"
                                      min={1}
                                      style={{ width: '60px' }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeRoundCriterion(idx, cIdx)}
                                    className="btn btn-outline-danger btn-xs border-0 flex-shrink-0"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-default font-weight-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary font-weight-bold"
                  >
                    {editingId ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มประเภท'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Competitions List */}
      <div className="row">
        {competitions.length === 0 ? (
          <div className="col-12">
            <div className="card p-5 text-center shadow-xs bg-white border">
              <div className="text-muted text-5xl mb-3"><i className="fas fa-trophy"></i></div>
              <h5 className="font-weight-bold text-dark mb-1">ยังไม่มีประเภทการประกวด</h5>
              <p className="text-muted text-xs mb-0">กดปุ่ม "เพิ่มประเภทประกวด" ด้านขวาเพื่อเริ่มต้น</p>
            </div>
          </div>
        ) : (
          competitions.map((comp) => (
            <div key={comp.id} className="col-12 mb-3">
              <div className="card card-primary card-outline shadow-sm bg-white mb-0">
                <div className="card-header d-flex justify-content-between align-items-center py-2.5 bg-gray-50/50">
                  <h3 className="card-title font-weight-bold text-secondary m-0" style={{ fontSize: '15px' }}>
                    <span className="badge badge-primary mr-2">{comp.name.charAt(0)}</span>
                    {comp.name}
                  </h3>
                  <div className="card-tools">
                    <button
                      onClick={() => handleEdit(comp)}
                      className="btn btn-link btn-xs text-primary font-weight-bold text-decoration-none mr-2 p-0 border-0 bg-transparent"
                    >
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id, comp.name)}
                      className="btn btn-link btn-xs text-danger font-weight-bold text-decoration-none p-0 border-0 bg-transparent"
                    >
                      <i className="fas fa-trash-alt"></i> ลบ
                    </button>
                  </div>
                </div>

                <div className="card-body py-3 px-4">
                  {comp.description && (
                    <div 
                      className="text-muted text-sm mb-3 font-medium rich-text-content" 
                      dangerouslySetInnerHTML={{ __html: comp.description }} 
                    />
                  )}
                  
                  <div className="mt-2.5">
                    <span className="text-xs font-bold text-secondary d-block mb-2">
                      <i className="fas fa-list-ol text-primary mr-1.5"></i> ลำดับรอบการประกวดและเกณฑ์การให้คะแนน
                    </span>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered m-0 text-xs bg-light">
                        <thead>
                          <tr className="bg-gray-100/50">
                            <th className="text-center" style={{ width: '60px' }}>รอบ</th>
                            <th style={{ width: '220px' }}>ชื่อรอบ</th>
                            <th className="text-center" style={{ width: '150px' }}>เป้าหมายตัดตัวเข้ารอบ</th>
                            <th>เกณฑ์การตัดสินเฉพาะรอบนี้ (คะแนนเต็ม)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comp.rounds?.map((r, rIdx) => (
                            <tr key={rIdx}>
                              <td className="text-center align-middle font-weight-bold">{rIdx + 1}</td>
                              <td className="align-middle font-weight-bold text-dark">{r.name}</td>
                              <td className="text-center align-middle text-secondary font-weight-semibold">
                                คัดผ่านเหลือ Top <span className="text-primary font-weight-bold">{r.topN}</span> คน
                              </td>
                              <td className="align-middle py-2">
                                {r.criteria && r.criteria.length > 0 ? (
                                  <ul className="list-unstyled m-0 pl-0">
                                    {r.criteria.map((c, cIdx) => (
                                      <div key={c.id} className="text-dark font-weight-bold mb-1" style={{ fontSize: '13px' }}>
                                        {cIdx + 1}. {c.name} &nbsp;&nbsp;
                                        <span className="text-muted font-weight-normal">({c.maxScore} คะแนน)</span>
                                      </div>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted font-italic">— ไม่มีเกณฑ์คะแนน (กรุณาแก้ไขเพื่อเพิ่มเกณฑ์) —</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CompetitionManager;
