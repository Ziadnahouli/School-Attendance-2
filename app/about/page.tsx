import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - Rafic Hariri Technical Institute Team',
  description: 'Driven by Innovation at RHIT - Development team behind the School Attendance Management System',
};

export default function AboutPage() {
  return (
    <div className="about-page-body">
      <div className="about-card">
        <div className="title-header">
          <i className="fas fa-tools"></i>
          <h1>Driven by Innovation at RHIT</h1>
        </div>

        <p>
          We are a dedicated group of students from <strong>Rafic Hariri Technical Institute</strong>, united by a
          passion for technology and a commitment to improving daily school efficiency. This project is the direct
          result of applying the knowledge and skills gained during our technical studies.
        </p>

        <p>
          Our core mission was to create a practical, impactful tool designed to streamline the daily routine for all
          school staff—<strong>simplifying organization, boosting productivity, and maximizing time efficiency.</strong>
        </p>

        <p>
          This initiative represents more than just a class project; it embodies our vision of{' '}
          <strong>leveraging technology to solve real-world problems</strong> within the educational environment. It’s a
          testament to the power of teamwork, where our unique strengths converged to build a valuable, functional
          system.
        </p>

        <p>
          We believe in continuous improvement and are excited to continue learning, iterating, and building tools that
          make a tangible difference in the lives of students, teachers, and administrators.
        </p>

        <div className="team-section">
          <h2>
            <i className="fas fa-users"></i> The Development Team
          </h2>

          <div className="team-member">
            <i className="fas fa-user-circle"></i>
            <span className="name">Ziad:</span>
            <a href="mailto:ziad.nahouli@rhhs.edu.lb">ziad.nahouli@rhhs.edu.lb</a>
          </div>

          <div className="team-member">
            <i className="fas fa-user-circle"></i>
            <span className="name">Baraa:</span>
            <a href="mailto:baraa.elmallah@rhhs.edu.lb">baraa.elmallah@rhhs.edu.lb</a>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <Link href="/" className="back-btn">
            <i className="fas fa-arrow-left"></i> Back to Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
