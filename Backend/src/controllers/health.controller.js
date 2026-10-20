const healthCheck = (req, res) => {
    res.status(200).json({
        success: true,
        message: "Qrenza API is running",
        timestamp: new Date().toISOString()
    });
};

export { healthCheck };
