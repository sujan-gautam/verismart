from datetime import datetime
from extensions import db

class Query(db.Model):
    __tablename__ = 'queries'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    responses = db.relationship('AIResponse', backref='query', lazy=True)
    confidence_score = db.Column(db.Float, nullable=True)  # Overall confidence score

class AIResponse(db.Model):
    __tablename__ = 'ai_responses'
    id = db.Column(db.Integer, primary_key=True)
    query_id = db.Column(db.Integer, db.ForeignKey('queries.id'), nullable=False)
    model_name = db.Column(db.String(50), nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    confidence_score = db.Column(db.Float, nullable=True)  # Individual model confidence
    agreement_score = db.Column(db.Float, nullable=True)  # Agreement with other responses

class CachedResponse(db.Model):
    __tablename__ = 'cached_responses'
    id = db.Column(db.Integer, primary_key=True)
    query_hash = db.Column(db.String(64), unique=True, nullable=False)
    query_text = db.Column(db.Text, nullable=False)
    verified_response = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    confidence_score = db.Column(db.Float, nullable=True)  # Cached confidence score