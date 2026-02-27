const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

// This is the API endpoint your Flutter app will call
app.get('/api/result/:regNo', async (req, res) => {
    const regNo = req.params.regNo;
    
    try {
        // REPLACE THIS URL with the actual BEU Result page URL
        const beuUrl = `http://results.beu.ac.in/results?regNo=${regNo}`; 
        
        const response = await axios.get(beuUrl);
        const html = response.data;
        const $ = cheerio.load(html);

        // You will need to inspect the BEU website to get these exact IDs/Classes
        const studentName = $('#student_name').text().trim(); 
        const sgpa = $('#final_sgpa').text().trim();
        const cgpa = $('#final_cgpa').text().trim();
        const status = $('#result_status').text().trim(); 
        const remarks = $('#remarks').text().trim();

        if (!studentName) {
            return res.status(404).json({ success: false, message: "Result not found" });
        }

        res.json({
            success: true,
            data: { regNo, name: studentName, sgpa, cgpa, status, remarks }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to connect" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));