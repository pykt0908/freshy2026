import React, { useState, useRef } from 'react';
import { exportData, importData, type BackupPayload } from '../../services/backupService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const BackupRestoreManager = () => {
  const { appUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('download', `stech_freshman_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      toast.success('ดาวน์โหลดไฟล์สำรองข้อมูลสำเร็จ');
    } catch (error) {
      console.error(error);
      toast.error('สำรองข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('กรุณาเลือกไฟล์สำรองข้อมูล (.json)');
      return;
    }

    const confirmMessage = clearExisting
      ? 'คำเตือน: ข้อมูลประเภทการประกวด ผู้เข้าประกวด และผลคะแนนเดิมในระบบทั้งหมดจะถูกลบ (ยกเว้นบัญชีแอดมินปัจจุบันของคุณ) แล้วแทนที่ด้วยข้อมูลจากไฟล์กู้คืน\n\nคุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?'
      : 'คุณแน่ใจหรือไม่ว่าต้องการนำเข้าข้อมูลนี้? ระบบจะบันทึกข้อมูลใหม่ทับหรือเพิ่มจากข้อมูลเดิม';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const payload = JSON.parse(text) as BackupPayload;

        // Basic validation
        if (
          !payload ||
          typeof payload !== 'object' ||
          !Array.isArray(payload.competitions) ||
          !Array.isArray(payload.contestants) ||
          !Array.isArray(payload.users) ||
          !Array.isArray(payload.scores)
        ) {
          throw new Error('รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง กรุณาใช้ไฟล์ที่ได้จากการส่งออกของระบบนี้');
        }

        const result = await importData(payload, clearExisting, appUser?.id);
        
        if (result.success) {
          toast.success(
            `กู้คืนข้อมูลสำเร็จ!\n- ประเภทการประกวด: ${result.stats.competitions} รายการ\n- ผู้เข้าประกวด: ${result.stats.contestants} รายการ\n- ผู้ใช้/กรรมการ: ${result.stats.users} รายการ\n- คะแนนโหวต: ${result.stats.scores} รายการ`,
            { duration: 5000 }
          );
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (error: any) {
        console.error(error);
        const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้าไฟล์';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error('ไม่สามารถอ่านไฟล์ได้');
      setLoading(false);
    };

    reader.readAsText(selectedFile);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="content-header p-0 mb-3 border-bottom pb-2">
        <h1 className="m-0 text-dark font-weight-bold" style={{ fontSize: '24px' }}>สำรองและกู้คืนข้อมูล</h1>
        <p className="text-muted text-sm mb-0">ส่งออกข้อมูลในระบบเป็นไฟล์สำรอง หรือนำเข้าเพื่อฟื้นฟูข้อมูลกลับมาทำงานต่อได้ทันที</p>
      </div>

      <div className="row">
        {/* Export Card */}
        <div className="col-md-6 mb-4">
          <div className="card card-primary card-outline shadow-sm h-100">
            <div className="card-header py-2.5">
              <h3 className="card-title font-weight-bold m-0 text-secondary" style={{ fontSize: '15px' }}>
                <i className="fas fa-download text-primary mr-1"></i> ส่งออกข้อมูลระบบ (Export)
              </h3>
            </div>
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-sm text-muted">
                  ระบบจะทำการแพ็กไฟล์ข้อมูลหลักของระบบทั้งหมดในระบบฐานข้อมูล ได้แก่:
                </p>
                <ul className="text-sm text-gray-700 pl-4 space-y-1 mb-4" style={{ listStyleType: 'disc' }}>
                  <li>ประเภทและรอบการประกวดต่างๆ (Competitions & Rounds)</li>
                  <li>ข้อมูลผู้เข้าประกวด (Contestants)</li>
                  <li>ข้อมูลผู้ใช้งานและบัญชีกรรมการทั้งหมด (Users/Judges)</li>
                  <li>ผลคะแนนการประเมินจากกรรมการทั้งหมด (Scores)</li>
                </ul>
                <p className="text-xs text-info bg-info-10 border border-info-20 p-2 rounded mb-4">
                  <i className="fas fa-info-circle mr-1"></i> ไฟล์สำรองข้อมูลที่ดาวน์โหลดไปจะอยู่ในรูปแบบ <strong>.json</strong> และสามารถเก็บไว้เพื่อนำเข้ากู้คืนทีหลังได้
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="btn btn-primary btn-block font-weight-bold py-2"
              >
                {loading ? (
                  <span>
                    <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                    กำลังสำรองข้อมูล...
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-file-download mr-1"></i> สำรองข้อมูลระบบทั้งหมด
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Import Card */}
        <div className="col-md-6 mb-4">
          <div className="card card-success card-outline shadow-sm h-100">
            <div className="card-header py-2.5">
              <h3 className="card-title font-weight-bold m-0 text-secondary" style={{ fontSize: '15px' }}>
                <i className="fas fa-upload text-success mr-1"></i> กู้คืนข้อมูลระบบ (Import)
              </h3>
            </div>
            <form onSubmit={handleImport} className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-sm text-muted mb-3">
                  เลือกไฟล์สำรองข้อมูล (.json) เพื่อกู้คืนสถานะของระบบประกวด
                </p>

                {/* File Input Group */}
                <div className="form-group mb-3">
                  <div className="custom-file">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      disabled={loading}
                      className="custom-file-input"
                      id="backupFile"
                    />
                    <label className="custom-file-label text-truncate" htmlFor="backupFile">
                      {selectedFile ? selectedFile.name : 'เลือกไฟล์สำรอง (.json)'}
                    </label>
                  </div>
                </div>

                {/* Clear Existing Checkbox */}
                <div className="custom-control custom-checkbox mb-3 select-none">
                  <input
                    type="checkbox"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    disabled={loading}
                    className="custom-control-input text-danger"
                    id="clearCheck"
                  />
                  <label htmlFor="clearCheck" className="custom-control-label font-weight-bold text-danger text-sm cursor-pointer">
                    ลบข้อมูลเก่าปัจจุบันทั้งหมดก่อนนำเข้า (Clear & Overwrite)
                  </label>
                </div>

                {/* Caution Warning Area */}
                {clearExisting && (
                  <div className="alert alert-danger text-xs py-2 px-3 mb-4 rounded border-0" style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>
                    <i className="fas fa-exclamation-triangle mr-1"></i> <strong>คำเตือน:</strong> ข้อมูลประเภทการประกวด, ผู้เข้าประกวด, บัญชีกรรมการ และผลคะแนนโหวตทั้งหมดที่มีอยู่ในระบบปัจจุบันจะถูก<strong>ลบถาวร</strong> ก่อนเริ่มนำเข้าข้อมูลจากไฟล์กู้คืน (ยกเว้นบัญชีผู้ใช้แอดมินที่คุณกำลังใช้งานอยู่)
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedFile}
                className={`btn ${clearExisting ? 'btn-danger' : 'btn-success'} btn-block font-weight-bold py-2`}
              >
                {loading ? (
                  <span>
                    <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                    กำลังนำเข้าข้อมูล...
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-file-upload mr-1"></i> กู้คืน/นำเข้าข้อมูลระบบ
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreManager;
