import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

describe('App', () => {
  test('renders memo app with header and empty state', () => {
    render(<App />)
    
    // Check if the app title is rendered
    expect(screen.getByText('メモ帳')).toBeInTheDocument()
    
    // Check if new memo button is rendered
    expect(screen.getByText('新規メモ')).toBeInTheDocument()
    
    // Check if empty state is shown when no memos exist
    expect(screen.getByText('メモがありません')).toBeInTheDocument()
    expect(screen.getByText('「新規メモ」ボタンをクリックして、最初のメモを作成しましょう。')).toBeInTheDocument()
  })

  test('switches to editor view when new memo button is clicked', async () => {
    render(<App />)
    
    // Click new memo button
    const newMemoButton = screen.getByText('新規メモ')
    fireEvent.click(newMemoButton)
    
    // Should switch to editor view
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メモを入力してください...')).toBeInTheDocument()
    })
    
    // New memo button should be hidden in editor view
    expect(screen.queryByText('新規メモ')).not.toBeInTheDocument()
    
    // Back button should be visible
    expect(screen.getByText('← 戻る')).toBeInTheDocument()
  })

  test('switches back to list view when back button is clicked', async () => {
    render(<App />)
    
    // Go to editor view
    const newMemoButton = screen.getByText('新規メモ')
    fireEvent.click(newMemoButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メモを入力してください...')).toBeInTheDocument()
    })
    
    // Click back button
    const backButton = screen.getByText('← 戻る')
    fireEvent.click(backButton)
    
    // Should switch back to list view
    await waitFor(() => {
      expect(screen.getByText('新規メモ')).toBeInTheDocument()
    })
    
    // Editor should be hidden
    expect(screen.queryByPlaceholderText('メモを入力してください...')).not.toBeInTheDocument()
  })
})