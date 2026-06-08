import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Star, ThumbsUp, Flag, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { apiHeaders } from '../utils/apiClient';

interface Review {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  rating: number;
  comment: string;
  verified: boolean;
  helpful: number;
  createdAt: string;
}

interface ReviewsProps {
  locationId: string;
  locationName: string;
  accessToken: string | null;
  onBack: () => void;
}

export function Reviews({ locationId, locationName, accessToken, onBack }: ReviewsProps) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [locationId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01/reviews/${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!accessToken) {
      toast.error('Please sign in to write a review');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...apiHeaders(accessToken),
          },
          body: JSON.stringify({ locationId, rating, comment }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      setShowWriteReview(false);
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (showWriteReview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button onClick={() => setShowWriteReview(false)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl">{t('reviews.writeReview')}</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{locationName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm mb-2 block">{t('reviews.yourRating')}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm mb-2 block">{t('reviews.yourReview')}</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={submitting || !comment.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? t('common.loading') : t('reviews.submit')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl">{t('reviews.title')}</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Rating Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-4xl">{avgRating}</div>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(parseFloat(avgRating))
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {reviews.length} {t('locations.reviews')}
              </div>
            </div>

            <Button
              onClick={() => setShowWriteReview(true)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            >
              {t('reviews.writeReview')}
            </Button>
          </CardContent>
        </Card>

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-8 text-gray-600">{t('common.loading')}</div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">{t('reviews.noReviews')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('reviews.beFirst')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{review.userName}</span>
                        {review.verified && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-gray-700">{review.comment}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <button className="flex items-center gap-1 hover:text-blue-600">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{t('reviews.helpful')}</span>
                      {review.helpful > 0 && <span>({review.helpful})</span>}
                    </button>
                    <button className="flex items-center gap-1 hover:text-red-600">
                      <Flag className="w-4 h-4" />
                      <span>{t('reviews.reportReview')}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
