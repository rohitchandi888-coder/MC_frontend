import React from 'react';

interface SitePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  id?: string;
}

const MAX_BUTTONS = 5;

export const SitePagination: React.FC<SitePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  id,
}) => {
  if (totalPages <= 1) return null;

  let startPage: number;
  if (totalPages <= MAX_BUTTONS) startPage = 1;
  else if (currentPage <= 3) startPage = 1;
  else if (currentPage >= totalPages - 2) startPage = totalPages - 4;
  else startPage = currentPage - 2;
  const endPage = Math.min(startPage + MAX_BUTTONS - 1, totalPages);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div
      id={id}
      className="site-pagination"
    >
      <button
        type="button"
        className="site-pagination-prev"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        Prev
      </button>
      <span className="site-pagination-info" aria-live="polite">
        {currentPage} / {totalPages}
      </span>
      {pageNumbers.map((pageNum) => {
        const isActive = pageNum === currentPage;
        return (
          <button
            type="button"
            key={pageNum}
            data-page={pageNum}
            aria-current={isActive ? 'page' : undefined}
            className={`site-pagination-num ${isActive ? 'site-pagination-num--active' : ''}`}
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </button>
        );
      })}
      <button
        type="button"
        className="site-pagination-next"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        Next
      </button>
    </div>
  );
};
