import React, { useRef, useEffect, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

const FaceDetection = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [glassesStyle, setGlassesStyle] = useState("/assets/glasses.png");

    const appendLog = (message) => {
        const logElement = document.getElementById("debugLogs");
        const timestamp = new Date().toLocaleTimeString();
        logElement.innerText += `[${timestamp}] ${message}\n`;
        logElement.scrollTop = logElement.scrollHeight;
    };

    useEffect(() => {
        const loadFaceMesh = async () => {
            let faceMesh;
            try {
                appendLog("Initializing FaceMesh...");
                faceMesh = new FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });
            } catch (e) {
                appendLog("Failed to load WASM version. Trying JavaScript version...");
                const { FaceMesh } = await import("@mediapipe/face_mesh/face_mesh.js");
                faceMesh = new FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });
            }

            appendLog("FaceMesh initialized successfully.");
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMesh.onResults((results) => {
                const canvasCtx = canvasRef.current.getContext("2d");
                canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    appendLog("Face landmarks detected successfully.");

                    const landmarks = results.multiFaceLandmarks[0];
                    const leftEye = landmarks[33];
                    const rightEye = landmarks[263];
                    const noseBridge = landmarks[168];

                    const img = new Image();
                    img.src = glassesStyle;
                    img.onload = () => {
                        appendLog(`Image loaded: ${img.src}`);
                        const canvasWidth = canvasRef.current.width;
                        const canvasHeight = canvasRef.current.height;

                        const leftX = leftEye.x * canvasWidth;
                        const leftY = leftEye.y * canvasHeight;
                        const rightX = rightEye.x * canvasWidth;
                        const rightY = rightEye.y * canvasHeight;

                        const glassesWidth = Math.sqrt(Math.pow(rightX - leftX, 2) + Math.pow(rightY - leftY, 2)) * 2;
                        const glassesHeight = glassesWidth / 2;

                        const centerX = noseBridge.x * canvasWidth - glassesWidth / 2;
                        const centerY = noseBridge.y * canvasHeight - glassesHeight / 2;

                        canvasCtx.drawImage(img, centerX, centerY, glassesWidth, glassesHeight);
                    };
                    img.onerror = () => {
                        appendLog(`Failed to load image: ${img.src}`);
                    };
                } else {
                    appendLog("No face detected.");
                }
            });

            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    appendLog("Processing camera frame...");
                    await faceMesh.send({ image: videoRef.current });
                },
                width: 640,
                height: 480,
                fps: 10 // Reduce the frame rate to reduce lag
            });

            camera.start().then(() => {
                appendLog("Camera started successfully.");
            }).catch((error) => {
                appendLog(`Failed to start camera: ${error.message}`);
            });
        };

        loadFaceMesh();
    }, [glassesStyle]);

    const saveImage = () => {
        const canvas = canvasRef.current;
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "try-on.png";
        link.click();
    };

    return (
        <div>
            <video ref={videoRef} style={{ display: "block" }} />
            <canvas ref={canvasRef} width={640} height={480} style={{ border: "1px solid black" }} />
            <div>
                <button onClick={() => setGlassesStyle("/assets/glasses1.png")}>Style 1</button>
                <button onClick={() => setGlassesStyle("/assets/glasses2.png")}>Style 2</button>
                <button onClick={() => setGlassesStyle("/assets/glasses3.png")}>Style 3</button>
                <button onClick={() => setGlassesStyle("/assets/glasses4.png")}>Style 4</button>
                <button onClick={() => setGlassesStyle("/assets/glasses5.png")}>Style 5</button>
                <button onClick={saveImage}>Save Image</button>
            </div>
            <div id="debugLogs" style={{ marginTop: "20px", whiteSpace: "pre-wrap", background: "#f4f4f4", padding: "10px", border: "1px solid #ccc", height: "100px", overflowY: "auto" }}>
                Debug Logs:
            </div>
        </div>
    );
};

export default FaceDetection;
