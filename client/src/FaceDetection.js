import React, { useRef, useEffect, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import './style.css';


const FaceDetection = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [glassesStyle, setGlassesStyle] = useState("/assets/glasses.png");
    const [preloadedImages, setPreloadedImages] = useState({});

    const appendLog = (message) => {
        const logElement = document.getElementById("debugLogs");
        const timestamp = new Date().toLocaleTimeString();
        logElement.innerText += `[${timestamp}] ${message}\n`;
        logElement.scrollTop = logElement.scrollHeight;
    };

    useEffect(() => {
        const preloadImages = (styles) => {
            const images = {};
            styles.forEach((style) => {
                const img = new Image();
                img.src = style;
                img.onload = () => appendLog(`Preloaded image: ${style}`);
                images[style] = img;
            });
            setPreloadedImages(images);
        };

        preloadImages([
            "/assets/glasses1.png",
            "/assets/glasses2.png",
            "/assets/glasses3.png",
            "/assets/glasses4.png",
            "/assets/glasses5.png",
        ]);

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

            if (!canvasRef.current || !canvasRef.current.getContext) {
                appendLog("Canvas or its context is not initialized.");
                return;
            }

            faceMesh.onResults((results) => {
                const canvasCtx = canvasRef.current.getContext("2d");
                canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    appendLog("Face landmarks detected successfully.");

                    const landmarks = results.multiFaceLandmarks[0];
                    const leftEye = landmarks[33];
                    const rightEye = landmarks[263];
                    const noseBridge = landmarks[168];

                    const img = preloadedImages[glassesStyle];
                    if (!img) {
                        appendLog(`Image not preloaded: ${glassesStyle}`);
                        return;
                    }

                    const canvasWidth = canvasRef.current.width;
                    const canvasHeight = canvasRef.current.height;

                    const leftX = leftEye.x * canvasWidth;
                    const leftY = leftEye.y * canvasHeight;
                    const rightX = rightEye.x * canvasWidth;
                    const rightY = rightEye.y * canvasHeight;

                    const glassesWidth = Math.sqrt(Math.pow(rightX - leftX, 2) + Math.pow(rightY - leftY, 2)) * 1.9;
                    const glassesHeight = glassesWidth / (img.width / img.height);

                    const angle = Math.atan2(rightY - leftY, rightX - leftX);
                    canvasCtx.save();
                    canvasCtx.translate(noseBridge.x * canvasWidth, (noseBridge.y * canvasHeight)+15);
                    canvasCtx.rotate(angle);
                    canvasCtx.drawImage(img, -glassesWidth / 2, -glassesHeight / 2, glassesWidth, glassesHeight);
                    canvasCtx.restore();
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
                fps: 10
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
        <div className="container">
            <div className="video-wrapper">
                <video ref={videoRef} />
                <canvas ref={canvasRef} width={640} height={480} />
            </div>
            <div className="controls">
                <button onClick={() => setGlassesStyle("/assets/glasses1.png")}>Style 1</button>
                <button onClick={() => setGlassesStyle("/assets/glasses2.png")}>Style 2</button>
                <button onClick={() => setGlassesStyle("/assets/glasses3.png")}>Style 3</button>
                <button onClick={() => setGlassesStyle("/assets/glasses4.png")}>Style 4</button>
                <button onClick={() => setGlassesStyle("/assets/glasses5.png")}>Style 5</button>
                <button onClick={saveImage}>Save Image</button>
            </div>
            <div id="debugLogs">
                Debug Logs:
            </div>
        </div>
    );
};

export default FaceDetection;
