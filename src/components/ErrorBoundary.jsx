import React from 'react';
import { Result, Button } from 'antd';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Beklenmedik bir hata oluştu"
          subTitle={this.state.error?.message}
          extra={
            <Button type="primary" onClick={() => this.setState({ hasError: false, error: null })}>
              Tekrar Dene
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
