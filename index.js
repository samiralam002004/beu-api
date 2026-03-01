const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

function findKey(obj, keyToFind) {
  if (obj === null || typeof obj !== 'object') return null;
  for (let key in obj) {
    if (key.toLowerCase() === keyToFind.toLowerCase() && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  for (let key in obj) {
    if (typeof obj[key] === 'object') {
      let result = findKey(obj[key], keyToFind);
      if (result !== null) return result;
    }
  }
  return null;
}

function extractSubjects(data) {
    let subjects = [];
    function search(obj) {
        if (Array.isArray(obj)) {
            if (obj.length > 0 && typeof obj[0] === 'object') {
                let keys = JSON.stringify(obj[0]).toLowerCase();
                if (keys.includes('ese') || keys.includes('grade') || keys.includes('credit') || keys.includes('sub')) {
                    subjects.push(...obj);
                } else {
                    obj.forEach(search);
                }
            } else {
                obj.forEach(search);
            }
        } else if (obj !== null && typeof obj === 'object') {
            for (let k in obj) {
                search(obj[k]);
            }
        }
    }
    search(data);
    let uniqueSubjects = [];
    let seenCodes = new Set();
    for (let sub of subjects) {
        let code = (findKey(sub, 'subject_code') || findKey(sub, 'sub_code') || findKey(sub, 'code') || '').toString().trim();
        if (code && !seenCodes.has(code)) {
            seenCodes.add(code);
            uniqueSubjects.push(sub);
        } else if (!code) {
            uniqueSubjects.push(sub);
        }
    }
    return uniqueSubjects;
}

// ✨ SMART EXTRACTOR: Grabs ONLY the last valid number in the list!
function getLatestScore(arr) {
    if (Array.isArray(arr)) {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] !== null && arr[i].toString().trim() !== '') {
                return arr[i].toString().replace(/[^0-9.]/g, '');
            }
        }
    } else if (typeof arr === 'string') {
        let parts = arr.split(',');
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i] !== null && parts[i].trim() !== '') {
                return parts[i].replace(/[^0-9.]/g, '');
            }
        }
    }
    return arr ? arr.toString().replace(/[^0-9.]/g, '') : "0.00";
}

app.get('/api/result/:regNo', async (req, res) => {
    const regNo = req.params.regNo;
    const semester = req.query.semester || 'I';
    const exam_held = req.query.exam_held || 'May/2025';
    const year = req.query.year || '2024';
    
    try {
        const response = await axios.get('https://beu-bih.ac.in/backend/v1/result/get-result', {
            params: {
                year: year,
                redg_no: regNo,
                semester: semester,
                exam_held: exam_held
            }
        });

        const beuData = response.data;

        if (!beuData || beuData.length === 0) {
            return res.status(404).json({ success: false, message: "Result not found" });
        }

        const name = findKey(beuData, 'studentName') || findKey(beuData, 'student_name') || findKey(beuData, 'name') || "N/A";
        const fatherName = findKey(beuData, 'fatherName') || findKey(beuData, 'father_name') || "N/A";
        const motherName = findKey(beuData, 'motherName') || findKey(beuData, 'mother_name') || "N/A";
        const course = findKey(beuData, 'courseName') || findKey(beuData, 'course_name') || findKey(beuData, 'branch') || "B.Tech";
        const college = findKey(beuData, 'collegeName') || findKey(beuData, 'college_name') || findKey(beuData, 'college') || "B. P. MANDAL COLLEGE OF ENGINEERING";
        
        // ✨ Passes raw data to the smart extractor
        const sgpaRaw = findKey(beuData, 'sgpa') || findKey(beuData, 'cur_sgpa') || "0.0";
        const cgpaRaw = findKey(beuData, 'cgpa') || findKey(beuData, 'cur_cgpa') || "0.0";
        
        const sgpa = getLatestScore(sgpaRaw);
        const cgpa = getLatestScore(cgpaRaw);

        const status = findKey(beuData, 'result') || findKey(beuData, 'remarks') || "PASS";

        const rawSubjects = extractSubjects(beuData);
        const formattedSubjects = rawSubjects.map(sub => {
            return [
                (findKey(sub, 'subject_code') || findKey(sub, 'sub_code') || findKey(sub, 'code') || '-').toString().trim(),
                (findKey(sub, 'subject_name') || findKey(sub, 'sub_name') || findKey(sub, 'name') || '-').toString().trim(),
                (findKey(sub, 'ese') || findKey(sub, 'theory_ese') || '-').toString().trim(),
                (findKey(sub, 'ia') || findKey(sub, 'mid_sem') || '-').toString().trim(),
                (findKey(sub, 'total') || findKey(sub, 'tot') || '-').toString().trim(),
                (findKey(sub, 'grade') || findKey(sub, 'gr') || '-').toString().trim(),
                (findKey(sub, 'credit') || findKey(sub, 'cr') || '-').toString().trim()
            ];
        });

        res.json({
            success: true,
            data: {
                regNo: regNo,
                name: name.toString().trim(),
                fatherName: fatherName.toString().trim(),
                motherName: motherName.toString().trim(),
                course: course.toString().trim(),
                college: college.toString().trim(),
                sgpa: sgpa,
                cgpa: cgpa,
                status: status.toString().toUpperCase().includes('FAIL') ? 'FAIL' : 'PASS',
                remarks: status.toString().trim(),
                subjects: formattedSubjects
            }
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to connect to BEU Server" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));