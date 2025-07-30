import React, { useState } from 'react';

const CustomDropdown = ({
    title = "Select",
    items = [],
    onClick,
    className = "",        // Pass width like "w-48" or "w-full" here
    itemKey = "id",
    itemLabel = "label"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState(title);

    const handleItemClick = (item) => {
        setSelectedLabel(item[itemLabel]);
        setIsOpen(false);
        if (onClick) onClick(item);
    };

    return (
        <div className={`relative inline-block text-left ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex w-full justify-between items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-gray-50 capitalize"
            >
                {selectedLabel}
                <svg
                    className={`ml-2 h-5 w-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.353a.75.75 0 011.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-2 min-w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        {items.map((item) => (
                            <button
                                key={item[itemKey]} // ensure itemKey is "_id"
                                onClick={() => handleItemClick(item)} // pass full item
                                className="block w-full px-4 py-2 text-left text-md text-gray-700 hover:bg-gray-200 capitalize"
                            >
                                {item[itemLabel]} {/* e.g., item.name */}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
