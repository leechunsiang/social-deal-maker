import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="container mx-auto max-w-4xl">
                <Link to="/signup">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Sign Up
                    </Button>
                </Link>

                <div className="bg-card rounded-xl shadow-elevated p-8 md:p-12">
                    <h1 className="text-4xl font-black mb-8 text-foreground">Privacy Policy</h1>

                    <div className="space-y-8 text-foreground">
                        <section>
                            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                            <p className="leading-relaxed text-muted-foreground">
                                This Privacy Policy (the "Policy") is established to inform you of how KadoshAI manages, collects, uses, and discloses your Personal Data in compliance with the Malaysian Personal Data Protection Act 2010 ("PDPA"). By accessing and using our web application and services, you hereby agree to the terms of this Policy and consent to the collection and processing of your Personal Data as described herein.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">2. The Personal Data We Collect</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">
                                We only collect Personal Data that is necessary for us to provide our services and manage our relationship with you.
                            </p>
                            <p className="leading-relaxed text-muted-foreground mb-4">
                                The specific categories of Personal Data we collect are:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li><strong className="text-foreground">Identity Data:</strong> Your full name.</li>
                                <li><strong className="text-foreground">Contact Data:</strong> Your email address.</li>
                            </ul>
                            <p className="leading-relaxed text-muted-foreground mt-4">
                                We do not collect Sensitive Personal Data (as defined under the PDPA) at this time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">3. Purpose of Collection and Processing</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">
                                We collect and process your Personal Data solely for the following purposes:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>To create and manage your user account on our web application.</li>
                                <li>To communicate with you regarding service updates, security notifications, or information relevant to your use of the application.</li>
                                <li>To provide you with customer support and respond to your queries or requests.</li>
                                <li>To comply with any applicable law, regulation, legal process, or governmental request in Malaysia or abroad.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">4. Disclosure of Personal Data</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">
                                We are committed to maintaining the confidentiality of your Personal Data. We will not disclose your Personal Data to any external third parties except in the following limited circumstances:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>Where we have obtained your explicit, written consent to do so.</li>
                                <li>Where the disclosure is required by law, court order, or governmental authority under the jurisdiction of Malaysia.</li>
                                <li>To third-party service providers and partners (e.g., cloud hosting services) who perform functions on our behalf and are bound by contractual confidentiality obligations to protect your data.</li>
                            </ul>
                            <p className="leading-relaxed text-muted-foreground mt-4">
                                We do not sell your Personal Data to any third parties for marketing purposes.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">5. Security and Retention of Data</h2>

                            <h3 className="text-xl font-semibold mb-3 mt-4">5.1. Security Measures</h3>
                            <p className="leading-relaxed text-muted-foreground">
                                We have implemented appropriate technical and organisational security measures to prevent unauthorised access, collection, use, disclosure, copying, modification, or disposal of your Personal Data. These measures include data encryption, access controls, and secure server environments.
                            </p>

                            <h3 className="text-xl font-semibold mb-3 mt-4">5.2. Data Retention</h3>
                            <p className="leading-relaxed text-muted-foreground">
                                We will retain your Personal Data only for as long as necessary to fulfil the purposes for which it was collected, as outlined in Section 3, or as required to comply with our legal and regulatory obligations under Malaysian law. Once your data is no longer required, we will securely destroy or permanently anonymise it.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">6. Your Rights Under the PDPA</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">
                                In accordance with the PDPA, you have the following rights concerning your Personal Data:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li><strong className="text-foreground">Right of Access:</strong> You have the right to request access to the Personal Data we hold about you.</li>
                                <li><strong className="text-foreground">Right of Correction:</strong> You have the right to request the correction of any incomplete, inaccurate, or out-of-date Personal Data we hold about you.</li>
                                <li><strong className="text-foreground">Right to Withdraw Consent:</strong> You have the right to withdraw your consent to the processing of your Personal Data at any time, subject to any applicable legal restrictions. Please note that withdrawing consent may affect your ability to use our services.</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
