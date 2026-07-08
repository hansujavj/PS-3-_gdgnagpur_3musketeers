const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    console.log('--- Step 1: Building Expo React Native Web App ---');
    // Run npx expo export --platform web
    execSync('npx expo export --platform web', { stdio: 'inherit' });

    console.log('--- Step 2: Preparing Target Directories ---');
    const targetDir = path.join(__dirname, 'dist-vercel');
    const appTargetDir = path.join(targetDir, 'app');

    // Clean target dir if it exists
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(appTargetDir, { recursive: true });

    console.log('--- Step 3: Copying Marketing Landing Page ---');
    const landingSrcDir = path.join(__dirname, 'public-landing');
    if (fs.existsSync(landingSrcDir)) {
        fs.cpSync(landingSrcDir, targetDir, { recursive: true });
    } else {
        throw new Error('Marketing landing page directory (public-landing) not found.');
    }

    console.log('--- Step 4: Copying Expo Web Build to /app Subdirectory ---');
    const expoBuildDir = path.join(__dirname, 'dist');
    if (fs.existsSync(expoBuildDir)) {
        fs.cpSync(expoBuildDir, appTargetDir, { recursive: true });
    } else {
        throw new Error('Expo web build directory (dist) not found.');
    }

    console.log('--- Build Completed Successfully! Output in dist-vercel/ ---');
} catch (error) {
    console.error('Error during Vercel build:', error);
    process.exit(1);
}
