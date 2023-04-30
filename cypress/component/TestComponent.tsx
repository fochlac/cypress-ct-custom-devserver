import React from 'react';

export const TestComponent = ({title, text}) => {
    console.log('</script>')
    return <div>
        <h1>{title}</h1>
        <p>{text}</p>
    </div>
}