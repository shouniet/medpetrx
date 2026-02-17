def hello_world():
    return "Hello, World!"

def test_hello_world():
    result = hello_world()
    assert result == "Hello, World!", f"Expected 'Hello, World!' but got '{result}'"
    print("Test passed:", result)

if __name__ == "__main__":
    test_hello_world()
