import 'reflect-metadata';
import { SmsModule } from './services/sms-service';

async function verify() {
    console.log('Verifying SMS Service...');
    try {
        await SmsModule.initialize();
        console.log('SmsModule initialized');

        if (SmsModule.routes) {
            console.log('Routes mounted');
        } else {
            console.error('Routes NOT mounted');
            process.exit(1);
        }

        console.log('Verification successful');
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
